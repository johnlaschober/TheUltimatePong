// Authors: John Laschober and Gabe Rivera
// Course Name: Web and Distributed Programming
// Project: Final
// Semester: Fall 2018

var express = require('express');
var app = express();
var serv = require('http').Server(app);
var port = process.env.PORT || 1234;

app.get('/', function(req,res){
    res.sendFile(__dirname + '/client/index.html');
});
app.use('/client', express.static(__dirname + '/client'));

serv.listen(port);
console.log("Ultimate Pong Has Started.");
//------------------------------------------------------
//Above is to grab the right webpage
//------------------------------------------------------
var SOCKET_LIST = {};
var PLAYER_LIST = {};

var indexedPlayerArray = new Array(); // PLAYER_LIST converted to an array you can use 'i' with
var outCoords = new Array(); // Array filled with arrays filled with 'out' box collision data
var reboundAnglesNeutral = new Array(); // Array for bounce trajectories

var canReflect = true;
var canCheckOut = true;

var numPlayers = 0;
var paddleWidth = 100/(numPlayers/2);

var circleRadius = 100;
var collisionPointAmount = 14; // How many 'out' collision points are along a paddle's path of movement
if (numPlayers == 2) // Hotfix for 2 players
{
    collisionPointAmount = 20;
}

var maxOffset, minOffset; // max and min amount a paddle can travel
var lastPaddleContact, lastOutContact;

var Player = function(id){
    var self = {
        id: id,
        randomColor: '#'+Math.floor(Math.random()*16777215).toString(16),
        startingXPos: 0,
        startingYPos: 0,
        currentXPos: 0,
        currentYPos: 0,
        pressingLeft: false,
        pressingRight: false,
        currentOffset: 0,
        degrees: 0,
        score: 0,
        paddleWidth: 100/(numPlayers/2),
        collisionCoordinates: new Array()
    }
    
    self.updatePosition = function(){
        // Controls that move paddle
        if(self.pressingLeft === true && self.currentOffset >= minOffset){
            self.currentOffset -= 1;
        }
        if(self.pressingRight === true && self.currentOffset <= maxOffset){
            self.currentOffset += 1;
        }

        // Set the 6 collision boxes that perform checks against the ball later
        self.collisionCoordinates[0] = {x: self.currentXPos, y: self.currentYPos};
        for (j = 1; j < 6; j++)
        {
            var childCollisionCoords = collisionPointHelper(self.currentXPos, self.currentYPos, j*self.paddleWidth/5, self.degrees);
            self.collisionCoordinates[j] = childCollisionCoords;
        }

        // Set current X and Y position used elsewhere
        self.currentXPos = Math.cos(self.degrees * Math.PI / 180)*self.currentOffset + self.startingXPos;
        self.currentYPos = Math.sin(self.degrees * Math.PI / 180)*self.currentOffset + self.startingYPos;
    }
    return self;
}

var Ball = function(){
    var self = {
        radius: 10,
        x: 0,
        y: 0,
        dx: 1,
        dy: -1
    }
    self.updatePosition = function(){
        // Bounce off canvas boundaries
        if (Math.abs(self.x + self.dx) > 600-300)
        {
            self.dx = -self.dx;
        }
        if (Math.abs(self.y + self.dy) > 400-200)
        {
            self.dy = -self.dy;
        }

        for (i = 0; i < indexedPlayerArray.length; i++) // For all players
        {
            var currentPlayer = indexedPlayerArray[i];
            for (j = 0; j < 6; j++) // Check all 6 collision boxes on a paddle
            {
                if (canReflect) // Timer so we don't reflect repeatedly in a paddle
                {
                    if (ballCollidedWithPoint(currentPlayer.collisionCoordinates[j])) // If ball collides with one of the paddle's collision points
                    {
                        lastPaddleContact = i;
                        setTimeout(function() {
                            self.dx = reboundAnglesNeutral[lastPaddleContact].x; // Set rebound angles
                            self.dy = reboundAnglesNeutral[lastPaddleContact].y;
                            calcRandomAngles();
                            // console.log("Ball reflect off Player " + lastPaddleContact);
                        }, 20);

                        reflectPause(); // Wait to reflect
                    }
                }
            }

            for (j = 0; j < collisionPointAmount; j++) // Check all 'out' collision boxes along paddle axis of movement
            {
                if (canCheckOut) // Timer so we don't spam 'out' checking
                {
                    if (ballCollidedWithPoint(outCoords[i][j])) // If we collide with an 'out' box
                    {
                        // Store changes in X and Y
                        var ballOutDx = self.dx;
                        var ballOutDy = self.dy;
                        lastOutContact = i; // Set last paddle contacted
                        setTimeout(function() { 
                            if (ballOutDx == self.dx && ballOutDy == self.dy) // If the change in X and change in Y does not change within 250 milliseconds
                            {
                                console.log("Player " + lastOutContact + " lost!");
                                updateScore(lastPaddleContact);
                                resetGame();
                            }
                        }, 250);
                        outPause();
                    }
                }
            }
        }

        // Set ball info used for collisions
        ballBottomLeftCoords[0] = self.x - self.radius;
        ballBottomLeftCoords[1] = self.y - self.radius;
        ballBottomRightCoords[0] = self.x - self.radius + ballDist;
        ballBottomRightCoords[1] = self.y - self.radius;
        ballTopLeftCoords[0] = self.x - self.radius;
        ballTopLeftCoords[1] = self.y - self.radius + ballDist;
        ballTopRightCoords[0] = self.x - self.radius + ballDist;
        ballTopRightCoords[1] = self.y - self.radius + ballDist;

        self.x += self.dx; // Update ball X every frame by moving it by the change in X
        self.y += self.dy; // Update b8all Y every frame by moving it by the change in Y
    }
    return self;
}

// Ball info used for checking collisions
var ballBottomLeftCoords = new Array();
var ballBottomRightCoords = new Array();
var ballTopLeftCoords = new Array();
var ballTopRightCoords = new Array();
var ballDist = 15;


var ball = Ball(); // Instantiate a single ball

var io = require('socket.io')(serv, {});
// On Connect
io.sockets.on('connection', function(socket){
    socket.id = Math.random();
    SOCKET_LIST[socket.id] = socket;
    ball = new Ball(); // Create one single ball

    numPlayers++; // Account for number of players
    var player = Player(socket.id); // Create players tied to sockets
    PLAYER_LIST[socket.id] = player;
    resetPlayers(); // Reset all player related info

    // On Disconnect
    socket.on('disconnect', function(){
        numPlayers--; // Remove player number
        delete SOCKET_LIST[socket.id];
        delete PLAYER_LIST[socket.id];
        resetPlayers();

    });

    // Server side controls
    socket.on('keyPress', function(data){
        if(data.inputId === 'left'){
            player.pressingLeft = data.state;
        }else if(data.inputId === 'right'){
            player.pressingRight = data.state;
        }
    });
});

// Update loop
setInterval(function(){
    // Send info to the client under 'newPositions' call
    var pack = [];
    for(var i in PLAYER_LIST){
        var player = PLAYER_LIST[i];
        player.updatePosition();
        pack.push({
            randomColor: player.randomColor,
            startingXPos: player.startingXPos,
            startingYPos: player.startingYPos,
            currentOffset: player.currentOffset,
            degrees: player.degrees,
            paddleWidth: player.paddleWidth
        });
    }
    ball.updatePosition();
    pack.push({
        radius: ball.radius,
        x: ball.x,
        y: ball.y
    });
    
    for(var i in SOCKET_LIST){
        var socket = SOCKET_LIST[i];
        socket.emit('newPositions',pack);
    }
}, 10);

// Set the maximum and minimum any paddle can travel
function setOffsets()
{
    maxOffset = 360/Math.pow(numPlayers, 1.2);
    minOffset = -maxOffset - (paddleWidth/1.6);
}

// Set the rotation a paddle with be spawned in at
function setPlayerDegrees()
{
    for (i = 0; i < numPlayers; i++)
    {
        var player = indexedPlayerArray[i];
        player.degrees = (360/numPlayers)*i + 90;
    }
}

// Set X and Y starting positions for all paddles
function setStartingPositions()
{
    for (i = 0; i < numPlayers; i++)
    {
        var player = indexedPlayerArray[i];
        player.startingXPos = circleRadius * Math.cos(2*Math.PI*(i/numPlayers));
        player.startingYPos = circleRadius * Math.sin(2*Math.PI*(i/numPlayers));
    }
}

// Turn PLAYER_LIST into an array you can grab with index i when looping through all players
function formIndexedPlayerArray()
{
    indexedPlayerArray = new Array();
    for(var i in PLAYER_LIST){
        var player = PLAYER_LIST[i];
        indexedPlayerArray.push(player);
    }
}

function updatePaddleWidths()
{
    for (i = 0; i < numPlayers; i++)
    {
        var player = indexedPlayerArray[i];
        player.paddleWidth = 50;
    }
    paddleWidth = 50;
}

function resetPlayers()
{
    formIndexedPlayerArray();
    setPlayerDegrees();
    setStartingPositions();
    updatePaddleWidths();
    updateOutCoords();
    calcRandomAngles();
    setOffsets();
}

// Create a line of "out boxes" when player number changes
function updateOutCoords()
{
    for (i=0; i < numPlayers; i++)
    {
        var playerDegrees = indexedPlayerArray[i].degrees;
        var startX = indexedPlayerArray[i].startingXPos;
        var startY = indexedPlayerArray[i].startingYPos;

        var item = new Array();
        for (j = 0; j < (collisionPointAmount/2); j++)
        {
            var outCoord = {x: Math.cos(playerDegrees * Math.PI / 180)*(j*(minOffset)/(collisionPointAmount/2)) + startX
                          , y: Math.sin(playerDegrees * Math.PI / 180)*(j*(minOffset)/(collisionPointAmount/2)) + startY};
            item.push(outCoord);
        }
        for (j = 0; j < (collisionPointAmount/2); j++)
        {
            var outCoord = {x: Math.cos(playerDegrees * Math.PI / 180)*(j*(maxOffset+paddleWidth)/(collisionPointAmount/2)) + startX
                          , y: Math.sin(playerDegrees * Math.PI / 180)*(j*(maxOffset+paddleWidth)/(collisionPointAmount/2)) + startY};
            item.push(outCoord);
        }
        outCoords[i] = item;
    }
}

// Timer so ball waits to reflect and doesn't get stuck
function reflectPause()
{
    canReflect = false;
    setTimeout(function() {
        canReflect = true;
    }, 250);
}

// Slight pause to see if a player has lost by missing the ball
function outPause()
{
    canCheckOut = false;
    setTimeout(function() {
        canCheckOut = true;
    }, 250);
}

// boolean if ball collided with collision box
function ballCollidedWithPoint(point)
{
    if (ballBottomLeftCoords[0] < point.x && point.x < ballBottomRightCoords[0])
    {
        if (ballBottomLeftCoords[1] < point.y && point.y < ballTopLeftCoords[1])
        {
            return true;
        }
    }
    return false;
}

// Get collision x and y coordinates
function collisionPointHelper(x1, y1, length, angle) {
    angle *= Math.PI / 180;

    var x2 = x1 + length * Math.cos(angle),
        y2 = y1 + length * Math.sin(angle);

    return {x: x2, y: y2};
}

function getRandom(min, max) {
    return Math.random();
}

// Create "random" bounce angles for when ball hits paddle
function calcRandomAngles()
{
    for (i = 0; i < numPlayers; i++)
    {
        var reboundAngle;
        var degrees = indexedPlayerArray[i].degrees-90;
        if (degrees >= 0 && degrees < 45)
        {
            reboundAngle = {x: -1, y: -getRandom(0,1)};
        }
        if (degrees >= 45 && degrees < 90)
        {
            reboundAngle = {x: -getRandom(0,1), y: -1};
        }
        if (degrees >= 90 && degrees < 135)
        {
            reboundAngle = {x: -getRandom(0,1), y: -1};
        }
        if (degrees >= 135 && degrees < 180)
        {
            reboundAngle = {x: getRandom(0,1), y: -1};
        }
        if (degrees >= 180 && degrees < 225)
        {
            reboundAngle = {x: 1, y: getRandom(0,1)};
        }
        if (degrees >= 225 && degrees < 270)
        {
            reboundAngle = {x: getRandom(0,1), y: 1};
        }
        if (degrees >= 270 && degrees < 315)
        {
            reboundAngle = {x: getRandom(0,1), y: 1};
        }
        if (degrees >= 315)
        {
            reboundAngle = {x: -getRandom(0,1), y: 1};
        }
        reboundAnglesNeutral[i] = reboundAngle;
    }
}

// Update the score
function updateScore(playerID)
{
    if (playerID)
    {
        var player = indexedPlayerArray[playerID];
        player.score++;

        // Send score packet
        var pack = [];
        for(var i in PLAYER_LIST){
            var player = PLAYER_LIST[i];
            pack.push({
                score: player.score
            });
        }
        
        for(var i in SOCKET_LIST){
            var socket = SOCKET_LIST[i];
            socket.emit('scoresUpdated',pack);
        }
    }
}

function resetGame()
{
    setTimeout(function() {
        ball.dx = 1
        ball.dy = getRandom(-1,1);
        ball.x = 0;
        ball.y = 0;

        for (i = 0; i < numPlayers; i++)
        {
            var player = indexedPlayerArray[i];
            player.currentOffset = 0;
        }
    }, 1000);
}
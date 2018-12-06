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

var indexedPlayerArray = new Array();
var outCoords = new Array();
var reboundAnglesNeutral = new Array();

var canReflect = true;
var canCheckOut = true;

var numPlayers = 0;
var paddleWidth = 100/(numPlayers/2);

var circleRadius = 100;
var collisionPointAmount = 14;

if (numPlayers == 2)
{
    collisionPointAmount = 20;
}

var maxOffset, minOffset;
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
        paddleWidth: 100/(numPlayers/2),
        collisionCoordinates: new Array()
    }
    
    self.updatePosition = function(){
        if(self.pressingLeft === true && self.currentOffset >= minOffset){
            self.currentOffset -= 1;
        }
        if(self.pressingRight === true && self.currentOffset <= maxOffset){
            self.currentOffset += 1;
        }

        self.collisionCoordinates[0] = {x: self.currentXPos, y: self.currentYPos};
        for (j = 1; j < 6; j++)
        {
            var childCollisionCoords = collisionPointHelper(self.currentXPos, self.currentYPos, j*self.paddleWidth/5, self.degrees);
            self.collisionCoordinates[j] = childCollisionCoords;
        }

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
        if (Math.abs(self.x + self.dx) > 600-300)
        {
            self.dx = -self.dx;
        }
        if (Math.abs(self.y + self.dy) > 400-200)
        {
            self.dy = -self.dy;
        }

        for (i = 0; i < indexedPlayerArray.length; i++)
        {
            var currentPlayer = indexedPlayerArray[i];
            for (j = 0; j < 6; j++)
            {
                if (canReflect)
                {
                    if (ballCollidedWithPoint(currentPlayer.collisionCoordinates[j]))
                    {
                        lastPaddleContact = i;
                        setTimeout(function() {
                            self.dx = reboundAnglesNeutral[lastPaddleContact].x;
                            self.dy = reboundAnglesNeutral[lastPaddleContact].y;
                            calcRandomAngles();
                            // console.log("Ball reflect off Player " + lastPaddleContact);
                        }, 20);

                        reflectPause();
                    }
                }
            }

            for (j = 0; j < collisionPointAmount; j++)
            {
                if (canCheckOut)
                {
                    if (ballCollidedWithPoint(outCoords[i][j]))
                    {
                        var ballOutDx = self.dx;
                        var ballOutDy = self.dy;
                        lastOutContact = i;
                        setTimeout(function() {
                            if (ballOutDx == self.dx && ballOutDy == self.dy)
                            {
                                console.log("Player " + lastOutContact + " lost!");
                            }
                        }, 250);
                        outPause();
                    }
                }
            }
        }

        ballBottomLeftCoords[0] = self.x - self.radius;
        ballBottomLeftCoords[1] = self.y - self.radius;
        ballBottomRightCoords[0] = self.x - self.radius + ballDist;
        ballBottomRightCoords[1] = self.y - self.radius;
        ballTopLeftCoords[0] = self.x - self.radius;
        ballTopLeftCoords[1] = self.y - self.radius + ballDist;
        ballTopRightCoords[0] = self.x - self.radius + ballDist;
        ballTopRightCoords[1] = self.y - self.radius + ballDist;

        self.x += self.dx;
        self.y += self.dy;
    }
    return self;
}
var ballBottomLeftCoords = new Array();
var ballBottomRightCoords = new Array();
var ballTopLeftCoords = new Array();
var ballTopRightCoords = new Array();
var ballDist = 15;


var ball = Ball();

var io = require('socket.io')(serv, {});
io.sockets.on('connection', function(socket){
    socket.id = Math.random();
    SOCKET_LIST[socket.id] = socket;
    ball = new Ball();

    numPlayers++;
    var player = Player(socket.id);
    PLAYER_LIST[socket.id] = player;
    resetPlayers();

    socket.on('disconnect', function(){
        numPlayers--;
        delete SOCKET_LIST[socket.id];
        delete PLAYER_LIST[socket.id];
        resetPlayers();

    });
    socket.on('keyPress', function(data){
        if(data.inputId === 'left'){
            player.pressingLeft = data.state;
        }else if(data.inputId === 'right'){
            player.pressingRight = data.state;
        }
    });
});

setInterval(function(){
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

function setOffsets()
{
    maxOffset = 360/Math.pow(numPlayers, 1.2);
    minOffset = -maxOffset - (paddleWidth/1.6);
}

function setPlayerDegrees()
{
    for (i = 0; i < numPlayers; i++)
    {
        var player = indexedPlayerArray[i];
        player.degrees = (360/numPlayers)*i + 90;
    }
}

function setStartingPositions()
{
    for (i = 0; i < numPlayers; i++)
    {
        var player = indexedPlayerArray[i];
        player.startingXPos = circleRadius * Math.cos(2*Math.PI*(i/numPlayers));
        player.startingYPos = circleRadius * Math.sin(2*Math.PI*(i/numPlayers));
    }
}

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

function reflectPause()
{
    canReflect = false;
    setTimeout(function() {
        canReflect = true;
    }, 250);
}

function outPause()
{
    canCheckOut = false;
    setTimeout(function() {
        canCheckOut = true;
    }, 250);
}

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

function collisionPointHelper(x1, y1, length, angle) {
    angle *= Math.PI / 180;

    var x2 = x1 + length * Math.cos(angle),
        y2 = y1 + length * Math.sin(angle);

    return {x: x2, y: y2};
}

function getRandom(min, max) {
    return Math.random();
}

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
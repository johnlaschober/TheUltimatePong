var express = require('express');
var app = express();
var serv = require('http').Server(app);
var port = process.env.PORT || 1234;

app.get('/', function(req,res){
    res.sendFile(__dirname + '/client/index.html');
});
app.use('/client', express.static(__dirname + '/client'));

serv.listen(port);
console.log("Lobby Test Has Started.");
//------------------------------------------------------
//Above is to grab the right webpage
//------------------------------------------------------
var SOCKET_LIST = {};
var PLAYER_LIST = {};
var lobbyOnePlayers = 0; //Amount of Players in Lobby One
var lobbyOneHostList = [];  //This array is used for checking who can start the game. 
                            //if you are the first one in the array you will start game.

var Player = function(id){
    var self = {
        x: 250,
        y: 150,
        width: 10, //width of paddle
        height: 50, //height of paddle
        id: id,
        randomColor: '#'+Math.floor(Math.random()*16777215).toString(16),
        pressingLeft: false,
        pressingUp: false,
        pressingRight: false,
        pressingDown: false,
        maxSpd: 10, //how fast the paddle moves
        lobbyNum: 0,
        host: false, //if they can start the game or not
        eliminated: false, //if they have been elimineted (((CURRENTLY NOT USED)))
    }
    self.updatePosition = function(){//Only allows paddle to move vertically
        if(self.pressingUp === true && self.y >= 0){
            self.y -= self.maxSpd;
        }
        if(self.pressingDown === true && self.y <= 270){
            self.y += self.maxSpd;
        }
    }
    self.updateLobby = function(num){
        self.lobby = num;
    }
    return self;
}

var ball = {
    x: 235,
    y: 155,
    width: 10, //Width of Ball
    height: 10, //Height of Ball
    speed: 0, //This does not update until the game has started. Then speed is updated
}

var io = require('socket.io')(serv, {});
io.sockets.on('connection', function(socket){
    socket.id = Math.random();
    SOCKET_LIST[socket.id] = socket;

    var player = Player(socket.id);
    PLAYER_LIST[socket.id] = player;
    socket.on('disconnect', function(){
        if(player.lobbyNum === 1){//If player disconnects, update how many people are in Game One
            lobbyOnePlayers -= 1;
        }
        if(lobbyOneHostList.indexOf(PLAYER_LIST[socket.id].id) > -1){
            lobbyOneHostList.splice(lobbyOneHostList.indexOf(PLAYER_LIST[socket.id].id), 1); //Whoever disconnects is deleted from the lobbyOneHostList[] Array
        }
        delete SOCKET_LIST[socket.id];
        delete PLAYER_LIST[socket.id];
        if(lobbyOneHostList.length > 0){
            PLAYER_LIST[lobbyOneHostList[0]].host = true; //If there is at least one person in Game One There should be a host which will be the first person joined. First Come First Serve
        }
    });
    socket.emit('init',{id: socket.id});

    socket.on('keyPress', function(data){ //Right and left might not be used***
        if(data.inputId === 'left'){
            player.pressingLeft = data.state;
        }else if(data.inputId === 'up'){
            player.pressingUp = data.state;
        }else if(data.inputId === 'right'){
            player.pressingRight = data.state;
        }else if(data.inputId === 'down'){
            player.pressingDown = data.state;
        }
    });
    socket.emit('updateLobbyOne',{players: lobbyOnePlayers, host: player.host});
    socket.on('joinLobbyOne',function(){
        console.log("Joined Lobby One");
        lobbyOneHostList.push(player.id);
        if(player.lobbyNum != 1 && lobbyOnePlayers < 8){
            player.lobbyNum = 1;
            lobbyOnePlayers += 1;
            if(lobbyOneHostList[0] === player.id){
                player.host = true;
            }
        }
    });
    //This is where Game Will Be initialized
    socket.on('startGame', function(){
        if(lobbyOnePlayers >= 2){
            for(var i in SOCKET_LIST){
                var socket = SOCKET_LIST[i];
                socket.emit('showCanvas');
            }
            if(lobbyOnePlayers == 2){
                for(var i = 0; i<lobbyOneHostList.length; i+=1){
                    //Have to add x and y values for 2 players here.
                    //get array [] and grab the first one and the second one []
                    for(var ii in PLAYER_LIST){ //Mapping the players
                        if(PLAYER_LIST[ii].id == lobbyOneHostList[i] && i == 0){
                            PLAYER_LIST[ii].x = 10;
                            PLAYER_LIST[ii].y = 135;
                        }else if(PLAYER_LIST[ii].id == lobbyOneHostList[i] && i == 1){
                            PLAYER_LIST[ii].x = 460;
                            PLAYER_LIST[ii].y = 135;
                        }
                    }
                }
                ball.x = 235; //Putting ball in center
                ball.y = 155; //Putting ball in center
                ball.speed = 4; //Ball speed
            }else if(lobbyOnePlayers == 3){//If 3 players in game

            }else if(lobbyOnePlayers == 4){// If 4 players in game

            }
        }
    });
});

var testCollisionRectRect = function(rectA,rectB){  //Checks For Collision Between 2 Rectangles
    if((rectA.x + rectA.width)>=(rectB.x) && (rectA.x <= (rectB.x + rectB.width)) && ((rectA.y + rectA.height)>=(rectB.y)) && (rectA.y<=(rectB.y + rectB.height))){
        return true; //returns true if collided
    }else{return false;} //returns false if did not collide
}

setInterval(function(){
    var pack = [];
    var hostpack = [];
    ball.x += ball.speed;
    for(var i in PLAYER_LIST){
        var player = PLAYER_LIST[i];
        player.updatePosition(); //Updates The positions on file in app.js
        pack.push({
            x: player.x,
            y: player.y,
            width: player.width,
            height: player.height,
            id: player.id,
            lobbyNum: player.lobbyNum,
            ball: ball, //All ball data will be the same
        });
        hostpack.push({
            myid: player.id,
            host: player.host,
        });
    }
    var collided = false; //Flag to check if ball collided with  a paddle
    for(var ii in PLAYER_LIST){
        if(PLAYER_LIST[ii].id == lobbyOneHostList[0]){
            if(testCollisionRectRect(ball, PLAYER_LIST[ii])){ //checks left paddle collision
                collided = true;
            }
        }else if(PLAYER_LIST[ii].id == lobbyOneHostList[1]){
            if(testCollisionRectRect(ball, PLAYER_LIST[ii])){ //checks right paddle collision
                collided = true;
            }
        }
    }
    if(collided === true){ //Changes the ball from going left to right and vice versa
        ball.speed = -ball.speed; 
    }
    for(var i in SOCKET_LIST){
        var socket = SOCKET_LIST[i];
        socket.emit('newPositions',pack); //Sends to Client to draw the new positions
        socket.emit('updateLobbyOne',{players: lobbyOnePlayers}); //Just sends a integer to how many people are in the lobby
        socket.emit('startButton', hostpack);

        if(ball.x <= 5){
            //display "You Lost!" to player 1 (left paddle)
            socket.emit('youLost',{id: lobbyOneHostList[0]});
            //display "You Won!" to player 2 (right paddle)
            socket.emit('youWon',{id: lobbyOneHostList[1]});
        }
        if(ball.x >= 475){
            //display "You Lost!" to player 2 (right paddle)
            socket.emit('youLost',{id: lobbyOneHostList[1]});
            //display "You Won!" to player 1 (left paddle)
            socket.emit('youWon',{id: lobbyOneHostList[0]});
        }
    }
    

}, 1000/50);


var express = require('express');
var app = express();
var serv = require('http').Server(app);

app.get('/', function(req,res){
    res.sendFile(__dirname + '/client/index.html');
});
app.use('/client', express.static(__dirname + '/client'));

serv.listen(1111);
console.log("Lobby Test Has Started.");
//------------------------------------------------------
//Above is to grab the right webpage
//------------------------------------------------------
var SOCKET_LIST = {};
var PLAYER_LIST = {};
var lobbyOnePlayers = 0; //Amount of Players in Lobby One
var lobbyOneHostList = [];

var Player = function(id){
    var self = {
        x: 250,
        y: 150,
        id: id,
        randomColor: '#'+Math.floor(Math.random()*16777215).toString(16),
        pressingLeft: false,
        pressingUp: false,
        pressingRight: false,
        pressingDown: false,
        maxSpd: 10,
        lobbyNum: 0,
        host: false,
    }
    self.updatePosition = function(){
        if(self.pressingLeft === true){
            self.x -= self.maxSpd;
        }
        if(self.pressingUp === true){
            self.y -= self.maxSpd;
        }
        if(self.pressingRight === true){
            self.x += self.maxSpd;
        }
        if(self.pressingDown === true){
            self.y += self.maxSpd;
        }
    }
    self.updateLobby = function(num){
        self.lobby = num;
    }
    return self;
}

var io = require('socket.io')(serv, {});
io.sockets.on('connection', function(socket){
    socket.id = Math.random();
    SOCKET_LIST[socket.id] = socket;

    var player = Player(socket.id);
    PLAYER_LIST[socket.id] = player;
    socket.on('disconnect', function(){
        if(player.lobbyNum === 1){
            lobbyOnePlayers -= 1;
        }
        if(lobbyOneHostList.indexOf(PLAYER_LIST[socket.id].id) > -1){
            lobbyOneHostList.splice(lobbyOneHostList.indexOf(PLAYER_LIST[socket.id].id), 1);
        }
        delete SOCKET_LIST[socket.id];
        delete PLAYER_LIST[socket.id];
        if(lobbyOneHostList.length > 0){
            PLAYER_LIST[lobbyOneHostList[0]].host = true;
        }
    });
    socket.emit('init',{id: socket.id});

    socket.on('keyPress', function(data){
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
        }
    });
});

setInterval(function(){
    var pack = [];
    var hostpack = [];
    for(var i in PLAYER_LIST){
        var player = PLAYER_LIST[i];
        player.updatePosition(); //Updates The positions on file in app.js
        pack.push({
            x: player.x,
            y: player.y,
            randomColor: player.randomColor,
        });
        hostpack.push({
            myid: player.id,
            host: player.host,
        });
    }
    for(var i in SOCKET_LIST){
        var socket = SOCKET_LIST[i];
        socket.emit('newPositions',pack); //Sends to Client to draw the new positions
        socket.emit('updateLobbyOne',{players: lobbyOnePlayers});
        socket.emit('startButton', hostpack);
    }
    

}, 1000/50);


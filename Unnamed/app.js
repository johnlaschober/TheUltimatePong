var express = require('express');
var app = express();
var serv = require('http').Server(app);
var port = process.env.PORT || 1234;

app.get('/', function(req,res){
    res.sendFile(__dirname + '/client/index.html');
});
app.use('/client', express.static(__dirname + '/client'));

serv.listen(port);
console.log("Unnamed Has Started.");
//------------------------------------------------------
//Above is to grab the right webpage
//------------------------------------------------------
var SOCKET_LIST = {};
var PLAYER_LIST = {};

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
    return self;
}

var io = require('socket.io')(serv, {});
io.sockets.on('connection', function(socket){
    socket.id = Math.random();
    SOCKET_LIST[socket.id] = socket;

    var player = Player(socket.id);
    PLAYER_LIST[socket.id] = player;
    socket.on('disconnect', function(){
        delete SOCKET_LIST[socket.id];
        delete PLAYER_LIST[socket.id];
    });
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
});

setInterval(function(){
    var pack = [];
    for(var i in PLAYER_LIST){
        var player = PLAYER_LIST[i];
        player.updatePosition();
        pack.push({
            x: player.x,
            y: player.y,
            randomColor: player.randomColor,
        });
    }
    for(var i in SOCKET_LIST){
        var socket = SOCKET_LIST[i];
        socket.emit('newPositions',pack);
    }
}, 1000/50);
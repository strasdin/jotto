// Setup basic express server
const express = require('express');
const app = express();
const path = require('path');
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const port = process.env.PORT || 3000;

server.listen(port, () => {
    console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(path.join(__dirname, 'public')));

// Chatroom

let numUsers = 0;

let gameStarted = false;

let p1Word = null;
let p2Word = null;

let p1 = null;
let p2 = null;

io.on('connection', (socket) => {
    let addedUser = false;

    // when the client emits 'new message', this listens and executes
    socket.on('new message', (data) => {
        // we tell the client to execute 'new message'
        socket.broadcast.emit('new message', {
            username: socket.username,
            message: data
        });
    });

    // when the client emits 'add user', this listens and executes
    socket.on('add user', (username) => {
        if (addedUser) return;

        // we store the username in the socket session for this client
        socket.username = username;
        ++numUsers;
        addedUser = true;
        socket.emit('login', {
            numUsers: numUsers
        });
        // echo globally (all clients) that a person has connected
        socket.broadcast.emit('user joined', {
            username: socket.username,
            numUsers: numUsers
        });
        if(numUsers === 1){
            p1 = socket.username;
        }else if(numUsers === 2){
            p2 = socket.username;
            startGame();
        }
    });

    // when the client emits 'typing', we broadcast it to others
    socket.on('typing', () => {
        socket.broadcast.emit('typing', {
            username: socket.username
        });
    });

    // when the client emits 'stop typing', we broadcast it to others
    socket.on('stop typing', () => {
        socket.broadcast.emit('stop typing', {
            username: socket.username
        });
    });

    // when the user disconnects.. perform this
    socket.on('disconnect', () => {
        if (addedUser) {
            --numUsers;

            // echo globally that this client has left
            socket.broadcast.emit('user left', {
                username: socket.username,
                numUsers: numUsers
            });
        }
    });

    /**********************************************/
    /************THIS IS THE SERVER****************/
    /**********************************************/

    socket.on('new guess', (data) => {
        // we tell the client to execute 'new message'
        if(socket.username === p1 && !p1Word){
            p1Word = data;
            io.sockets.emit('new message', {
                username: socket.username,
                message: 'has chosen their word.'
            });
        }else if(socket.username === p2 && !p2Word){
            p2Word = data;
            io.sockets.emit('new message', {
                username: socket.username,
                message: 'has chosen their word.'
            });
        }else{
            io.sockets.emit('new guess', {
                username: socket.username,
                guess: data,
                numCorrect: getCorrect(data)
            });
            if(isCorrect(data)){
                let winWord = '';
                let loseWord = '';
                if(socket.username === p1){
                    winWord = p2Word;
                    loseWord = p1Word;
                }else if(socket.username === p2){
                    winWord = p1Word;
                    loseWord = p2Word;
                }
                io.sockets.emit('jotto win', {
                    username: socket.username,
                    winner: socket.username,
                    winWord: winWord,
                    loseWord: loseWord
                });
            }
        }
        
    });

    const getCorrect = (guess) => {
        let target = '';
        if(socket.username === p1){
            target = p2Word;
        }else if(socket.username === p2){
            target = p1Word;
        }
        let count = 0;
        for(let i in target){
            if(guess.includes(target[i])){
                count++;
            }            
        }
        return count;
    }
    const isCorrect = (guess) => {
        let target = '';
        if(socket.username === p1){
            target = p2Word;
        }else if(socket.username === p2){
            target = p1Word;
        }
        return target === guess;
    }

    const startGame = () => {
        io.sockets.emit('jotto start', null);
    }


});
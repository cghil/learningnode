var socketio = require('socket.io');
var io;
var guestNumber = 1;
var nickNames = 1;
var namesUsed = [];
var currentRoom = {};

exports.listen = function(server){
	io = socketio.listen(server); // start Socket.IO server, allowing it to piggyback on existing HTTP server
	io.set('log level', 1); 

	io.sockets.on('connection', function(socket){ // define how each user connection will be handled
		guestNumber = assignGuestName(socket, guestNumber, nickNames, namesUsed); //assign user a guest name when they connect
		joinRoom(socket, 'Lobby'); // place user in lobby room when they connect

		handleMessageBroadcasting(socket, nickNames); // handle user messages, name-change attempts, and room creation/changes
		handleNameChangeAttempts(socket, nickNames, namesUsed);
		handleRoomJoining(socket);

		socket.on('room', function(){ // provide user with list of occupied rooms on request
			socket.emit('rooms', io.sockets.manager.rooms);
		});

		handleClientDisconnection(socket, nickNames, namesUsed); // define cleanup logic for when user disconnects
	});
};

function assignGuestName(socket, guestNumber, nickNames, namesUsed){
	var name = 'Guest' + guestNumber; // generate new guest name
	nickNames[socket.id] = name; // assoicate guest name with client connection id
	socket.emit('nameResult', { // let user know their guest name
		success: true,
		name: name
	});
	namesUsed.push(name); // note that guest name is now used
	return guestNumber + 1; //increment counter used to generate guest names
}

function joinRoom(socket, room){
	socket.join(room); // make user join room
	currentRoom[socket.id] = room // note that user is now in this room
	socket.emit('joinResult', {room: room});
	socket.broadcast.to(room).emit('message', {text: nickNames[socket.id] + ' has joined ' + room + '.'});

	var usrersInRoom = io.sockets.clients(room);
	if (usersInRoom.length > 1) {
		var usersInRoomSummary = 'Users currently in ' + room + ': ';
		for (var index in usersInRoom) {
			var userSocketId = usersInRoom[index].id;
			if (userSocketId != socket.id) {
				if (index > 0) {
					usersInRoomSummary += ', ';
					usersInRoomSummary += nickNames[userSocketId];
				}
			}
			usersInRoomSummary+= '.';
			socket.emit('message', {text: usersInRoomSummary})
		}
	}
}

function handleNameChangeAttempts(socket, nickNames, namesUsed){
	socket.on('nameAttempt', function(name){ // add listener for nameAttempt events
		// don't allow nicknames to begin with guest
		if name.indexOf('Guest' == 0) { // dont allow nicknames with to begin with Guest
			socket.emit('nameResult', {
				success: false,
				message: 'Names cannot begin with "Guest".'
			});
		} else {
			if (namesUser.indexOf(name) == -1) { // if name isnt already registered
				var previousName = nickNames[socket.id];
				var previousNameIndex = namesUsed.indexOf(previousName);
				namesUsed.push(name);
				nickNames[socket.id] = name;
				delete namesUsed[previousNameIndex]; // remove previous name to make available to other clients
				socket.emit('nameResult', {
					success: true,
					name: name
				});
				socket.broadcast.to(currentRoom[socket.id]).emit('message', {
					text: previousName + ' is now known as ' + name + '.'
				});
			} else {
				socket.emit('nameResult', {
					success: false,
					message: 'That name is already in use.'
				});
			}
		}
	});
}

function handleMessageBroadcasting(socket){
	socket.on('message', function(message){
		socket.broadcast.to(message.room).emit('message', {
			text: nickNames[socket.id] + ': ' + message.text
		});
	});
}

function handleRoomJoining(socket){
	socket.on('join', function(room){
		socket.leave(currentRoom[socket.id]);
		joinRoom(socket, room.newRoom)
	})
}
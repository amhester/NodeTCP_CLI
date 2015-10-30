var net = require('net');
var crypto = require('crypto');

var prime = new Buffer("fda9af78aa9076aeb973e4c63791dd407c68c9fcac03dc8e8118f53743c92e6f8400ff64114796ecba3b8692702ec6cc9acae46c071e78f80fe33a76b5e01a9b", 'hex');
var bob = crypto.createDiffieHellman(prime);
bob.generateKeys();
var bobPub = bob.getPublicKey();

var algorithm = 'aes-256-ctr';

var clients = {};

var server = net.createServer(function (socket) {
	var uid = socket.remoteAddress + ':' + socket.remotePort;
	clients[uid] = socket;
	getName();
	
	function getName() {
		socket.once('data', function (data) {
			data = JSON.parse(data);
			socket.name = data.name;
			socket.sharedSecret = bob.computeSecret(data.alicePub, 'hex', 'hex');
			var bS = bobPub.toString('hex');
			socket.write(JSON.stringify({ bobPub: bS}));
			broadcast(socket.name + " has joined the chat.\n", uid);
			setupClient();
		});
	}
	
	function setupClient() {
		socket.on('data', function (data) {
			var message = decrypt(data.toString(), clients[uid].sharedSecret);
			broadcast(socket.name + "> " + message, uid);
		});
		
		socket.on('end', function () {
			console.log('socket ended');
			clients[uid].destroy();
			delete clients[uid];
			broadcast(socket.name + " has left the chat.\n", uid);
		});
		
		socket.on('close', function () {
			console.log('closing socket');
			//clients[uid].destroy();
			delete clients[uid];
		});
	}
});

server.on('error', function (err) {
	console.log('Server error.\n' + err);
});

server.listen(8124, function () {
	console.log('server now listening on port 8124...');
});

function broadcast(message, sender) {
	for(var client in clients) {
		if(clients.hasOwnProperty(client)) {
			if(client !== sender) {
				clients[client].write(encrypt(message, clients[client].sharedSecret));
			}	
		}
	}	
	console.log(message);
}

function encrypt(text, ss) {
	var cipher = crypto.createCipher(algorithm, ss);
	var crypted = cipher.update(text, 'utf8', 'hex');
	crypted += cipher.final('hex');
	return crypted;
}

function decrypt(text, ss) {
	var decipher = crypto.createDecipher(algorithm, ss);
	var dec = decipher.update(text, 'hex', 'utf8');
	dec += decipher.final('utf8');
	return dec;
}
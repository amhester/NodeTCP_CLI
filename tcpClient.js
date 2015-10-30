var net = require('net');
var chalk = require('chalk');
var crypto = require('crypto');

var prime = new Buffer("fda9af78aa9076aeb973e4c63791dd407c68c9fcac03dc8e8118f53743c92e6f8400ff64114796ecba3b8692702ec6cc9acae46c071e78f80fe33a76b5e01a9b", 'hex');
var alice = crypto.createDiffieHellman(prime);
alice.generateKeys();
var alicePub = alice.getPublicKey().toString('hex');

var algorithm = 'aes-256-ctr';
var sharedSecret = null;

var name = "";

getName();

function getName() {
	//console.log("Type your desired name: ");
	process.stdout.write("Type your desired name: ");
	process.stdin.resume();
	process.stdin.once('data', function (data) {
		process.stdin.pause();
		name = data.toString().trim();
		startChat();
	});
}

function startChat() {
	
	var client = net.connect({port: 8124, host: '54.236.173.82'}, function () {
		client.write(JSON.stringify({ name: name, alicePub: alicePub }));
		readInput();
	});
	
	client.once('data', function (data) {		
		data = JSON.parse(data);
		sharedSecret = alice.computeSecret(data.bobPub, 'hex', 'hex');
		
		client.on('data', function (data) {
			data = decrypt(data.toString());
			var from = data.toString().split('>')[0];
			var message = data.toString().split('>')[1];
			console.log(chalk.green(from + '>') + message);
		});
	});	

	client.on('end', function () {
		console.log('Disconnected from the server.');
		process.stdin.pause();
	});

	function readInput() {
		process.stdin.resume();	
	}

	process.stdin.on('data', function (data) {	
		data = data.toString().trim();
		var eMessage = encrypt(data);
		client.write(eMessage);
	});	
	
	process.on('exit', function (code) {
		client.end();
	});
	
	process.on('SIGINT', function () {
		client.end();
	});
	
	process.on('SIGHUP', function () {
		client.end();
	});
}

function encrypt(text) {
	var cipher = crypto.createCipher(algorithm, sharedSecret);
	var crypted = cipher.update(text, 'utf8', 'hex');
	crypted += cipher.final('hex');
	return crypted;
}

function decrypt(text) {
	var decipher = crypto.createDecipher(algorithm, sharedSecret);
	var dec = decipher.update(text, 'hex', 'utf8');
	dec += decipher.final('utf8');
	return dec;
}
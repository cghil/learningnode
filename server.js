var http = require('http');

var fs = require('fs');

var path = require('path');

var mime = require('mime');

var cache = {};


// Sending File Data and Error Responses
// three helper functions

// first handle the sending of 404 errors when a file is requested that doesn't exist

function send404(response){
	response.writeHead(404, {'Content-Type': 'text/plain'});
	response.write('Error 404 : resource not found');
	response.end();
}

// first writes the appropriate HTTP headers and then sends the contents of the file

function sendFile(response, filePath, fileContents){
	response.writeHead(
		200,
		{"content-type": mime.lookup(path.basename(filePath))}
	);
	response.end(fileContents);
}

function serveStatic(response, cache, absPath){
	if (cache[absPath]){ // check if file is cached in memory
		sendFile(response, absPath, cache[absPath]); // serve file from memory
	} else {
		fs.exists(absPath, function(exists){ // check if file exists
			if (exists) {
				fs.readFile(absPath, function(err, data){ // read file from disk
					if (err) {
						send404(response);
					} else {
						cache[absPath] = data;
						sendFile(response, absPath, data); // serve file read from disk
					}
				});
			} else {
				send404(response); // send http 404 response
			}
		});
	}
}

var server = http.createServer(function(request, response){ // create HTTP serer, using anonymous function to define per-request behavior
	var filePath = false;

	if (request.url == '/') {
		filePath = 'public/index.html'; // determine html file to served by default
	} else {
		filePath = 'public' + request.url; // translate URL path to relative file path
	}

	var absPath = "./" + filePath;
	serveStatic(response, cache, absPath); // serve static file
});

server.listen(3001, function(){
	console.log('Server listening on port 3001');
});
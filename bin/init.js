var express = require('express');
var http = require('http');

var handler = require('../servers/' + process.argv[2] + '/handler.js');
var port = process.argv[3];

//CREATE EXPRESS APP
var app = express();
var httpServer;
handler(app,function(err){

	if (err){
		console.error(err);
		process.exit(1);
	}

	httpServer = http.createServer(app).listen(port,'localhost',function(){
		console.log("Server running at port %s",httpServer.address().port)
	});
});

process.on('SIGINT',function(){
	httpServer.close(function(){
		process.exit(0);
	});
})

if (process.argv[4] === 't') {
	process.send = console.log
}

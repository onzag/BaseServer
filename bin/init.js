var express = require('express');
var http = require('http');

var handler = require('../servers/' + process.argv[2] + '/handler.js');
var port = process.argv[3];

var general_test = process.argv[4] === 't';
var micro_test = process.argv[4] === 'mt';

//CREATE EXPRESS APP
var app = express();
var httpServer = http.createServer(app);
handler(app,httpServer,function(err){

	if (err){
		console.error(err);
		process.exit(1);
	}

	httpServer.listen(port,'localhost',function(){
		console.log("Server running at port %s",httpServer.address().port)
	});
},general_test || micro_test);

process.on('SIGINT',function(){
	httpServer.close(function(){
		process.exit(0);
	});
})

if (micro_test) {
	process.send = console.log
}

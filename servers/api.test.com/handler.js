module.exports = function(app,done){

	app.get('/ping',function(req,res){
		process.send('getting pinged');
		res.end('pong');
	});

	done(null);
}

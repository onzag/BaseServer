var cp = require('child_process');
var fs = require('fs');

var splitted = process.argv[2].split('/');
var servername = splitted[splitted.length - 1]

var config = require('../servers/' + process.argv[2] + '/config.js');

var test = process.argv[3] === 't';
var children = {};

//Try to get the log handler
var logHandler = null;
try {
	if (!test){
		logHandler = require('../servers/' + process.argv[2] + '/log.js');
	} else {
		logHandler = require('../servers/' + process.argv[2] + '/log.test.js');
	}
} catch (e){
	if (!test){
		var logstream = fs.createWriteStream('./log/' + servername + '.log', {'flags': 'a'});

		logHandler = {
			'log':function(type,data){
				var msg = '[' + (new Date()) + '] (' + type.toUpperCase() + ')\t' + JSON.stringify(data) + '\n';
				logstream.write(msg);
			},
			'die':function(){
				logstream.end('======= SERVER IS OFF =======\n');
			},
			'init':function(){
				logstream.write('======= SERVER IS ON =======\n');
			}
		};
	} else {
		logHandler = {
			'log':function(type,data){
				console.log(type,data);
				if (type === 'uncaughtException' || type === 'instanceUncaughtException'){
					console.error(data.err.stack);
				}
			},
			'die':function(){
				console.log('DEAD');
			},
			'init':function(){
				console.log('INIT');
			}
		}
	}
}

//Show the init on the log side
logHandler.init();

//write the process in the handler file if not test
if (!test){
	fs.writeFileSync('./process/' + servername,process.pid);
}

function cleanup(){
	if (!test){try{fs.unlinkSync('./process/' + servername)}catch(e){}};
	Object.keys(children).forEach(function(port){
		child = children[port];
		child.removeAllListeners("exit");
		process.kill(child.pid,"SIGKILL");
		logHandler.log('instanceKill',{'port':port});
	});
	logHandler.die();
	process.exit(0);
}

//Add main process actions
process.on('exit',function(status){
	logHandler.log('exit',null,{'status':status});
	cleanup()
});
process.on('SIGINT',function(){
	process.exit(0);
});
process.on('uncaughtException',function(err){
	logHandler.log('uncaughtException',{'err':err});
	cleanup();
});

process.on('SIGHUP',function(){
	logHandler.log('reload',null);

	delete require.cache[require.resolve('../servers/' + process.argv[2] + '/config.js')]
	config = require('../servers/' + process.argv[2] + '/config.js');

	if (!config.DYNAMIC){
		process.exit(0);
	}

	var hosts = (config.DYNAMIC.HOST instanceof Array) ? config.DYNAMIC.HOST : [config.DYNAMIC.HOST];
	var portsListed = hosts.filter(function(host){
		return (host.host === 'localhost')
	}).map(function(host){
		return host.port;
	});

	if (portsListed.length === 0){
		process.exit(0);
	}

	var portsReloaded = [];

	Object.keys(children).forEach(function(port){

		if (port in portsListed){
			portsReloaded.push(port);
		}

		child = children[port];
		child.removeAllListeners("exit");
		child.on('exit',function(){
			if (port in portsListed){
				childHandler('reload',port,null);
			}
		});
		process.kill(child.pid,"SIGINT");
	});

	portsListed.forEach(function(port){
		if (!(port in portsReloaded)){
			childHandler('reload',port,null);
		}
	})
});

//If we have a dynamic site
if (config.DYNAMIC){

	//Get the instances we will have and in which ports
	var hosts = (config.DYNAMIC.HOST instanceof Array) ? config.DYNAMIC.HOST : [config.DYNAMIC.HOST];

	hostamount = 0;
	//for every host we have
	hosts.forEach(function(dt){

		//get the host and the port
		var host = dt.host;
		var port = dt.port;

		//we care only if the host is localhost
		if (host === 'localhost'){
			hostamount+=1;

			//we try to initializate the handler.js at the given port
			var args = [process.argv[2],port];
			if (test){
				args.push('t');
			}
			var child = cp.fork('./bin/init.js',args);

			//put the listeners for logging
			child.on('exit',function(code){
				childHandler('exit',port,code);
			});
			child.on('uncaughtException',function(err){
				logHandler.log('instanceUncaughtException',{'err':err,'port':port})
			});

			//and the message listener as well
			child.on('message',logHandler.log.bind(null,'message'));

			children[port] = child;
		}
	});

	if (hostamount === 0){
		throw new Error('This page has no dynamic local content so it cannot be handled like one');
	}
} else {
	throw new Error('This page is not dynamic so it cannot be ran as one');
}

//The child handler provides handling data
function childHandler(reason,port,arg){

	delete children[port];

	if (test){
		return;
	}

	var creason = 'instance' + reason.charAt(0).toUpperCase() + reason.slice(1);
	var data = {'port':port};
	if (reason === 'exit'){
		data['status'] = arg;
	} else if (reason === 'uncaughtException'){
		data['err'] = arg;
	}

	logHandler.log(creason,data);

	var child = cp.fork('./bin/init.js', [process.argv[2],port]);

	logHandler.log('instanceRespawn',{'port':port});

	child.on('exit',function(code){
		childHandler('exit',port,code);
	});
	child.on('uncaughtException',function(err){
		logHandler.log('instanceUncaughtException',{'err':err,'port':port})
	});

	child.on('message',logHandler.log.bind(null,'message'));

	children[port] = child;
}

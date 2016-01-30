Library Still under development.

# Base Server for Node.js

This is a server that can be used as a base for creating server in unix based computers, it's a rather simple design and doesn't work by itself but must be extended,
it relies on nginx (so it must be installed).

## Servers folder

This server relies on its inside domains, in order to perform routing, in the folder servers, you'd add as many subdomains/domains and necessary; and they'll provide,
configuration data for how it's going to be shown.

in order to add a server add a folder with the domain/subdomain name of the server eg `api.mysite.com` and create a configuration file named `config.js`

### Configuration file

this file must contain the following

```javascript
module.exports = {
	HIDDEN:true,				//hidden from searching, crawling
	HIDDEN:false,				//visible for search engines

	ERR404:null,				//no 404 page redirection for unknown locations
	ERR404:'/err/404.html',			//404 page

	DYNAMIC:true,				//allow dyanmic interaction (proxy)

	//Where to redirect requests (only matter if DYNAMIC)
	//Will use an algorithm to pick from the following servers
	//Redundancy servers
	DYNAMICHOST:[
		{
			host:'localhost',	//internal host (will require a handler)
			port:8001
		},
		{
			host:'localhost',	//internal host (will require a handler)
			port:8002
		},
		{
			host:'192.168.1.7',	//external host
			port:80,
		}
	],

	//Only redirect requests to the dynamic part if the url starts with dynamic
	DYNAMICURL:'/dynamic',

	//Only redirect requests to the dynamic part if the url ends with html (Regexp)
	DYNAMICURL:/\.html/,

	//Both at the same time
	DYNAMICURL:[/\.html/,'/dynamic'],

	STATIC:true,				//allow static interaction (static files in a location)

	STATICURL:'/',				//static url that will be used to choose as file service
						//dynamic urls has predilection, so if you set '/api/v1' to be dynamic
						//and '/' to be static, then api/v1 will still be dynamic

	STATICURL:[/\.css/,'/static'],		//css and files in /static are to be static

	STATICFOLDER:'staticfiles', 		//where to seek for static files, inside the server folder

	STATICFOLDER:['/home/stuff/static/css','/home/stuff/static/general'], //and considering the previous STATICURL array option, the .css will match
										//the first path and the static the second path

	STATICLIFETIME:"1d",				//the lifetime of the cache
	STATICLIFETIME:["1s","1d"],			//per url/location as well

	STATICHEADERS:{					//headers to set for the static files
		'keep-alive':true
	},
	STATICHEADERS:[
		{
			'keep-alive':true		//headers to set only for the first url match
		},
		{}					//for the second
	]
}
```

### handler file

The handler is a simple file that provides a ready express app that you should use as it contains all the parameters required to work,
these are only launch for specific localhost instances.

handlers exist alongside the config.js file for that server, and they're only launched if there's ever a server that is dynamic and has
localhost usage.

```javascript
module.exports = function(app,done){

	//modify the app
	app.get('/ping',function(req,res){
		res.end('pong');
	});

	done(null); //you can throw an error
}
```

### log file

By default this server will send logs to an standard stream file, note that when you want to log something you should use `process.send({'stuff':'data'})` and
that will be sent to the standard log handler for those server instances.

```javascript
module.exports = function(app,done){
	app.get('/ping',function(req,res){
		process.send({'action':'someone pinged me'})
		res.end('pong');
	});

	done(null); //you can throw an error
}
```

in order to have your own log handler you have to create a file named `log.js` alongside config.js with the following structure

```javascript

//preconfiguration

module.exports = {
	'init':function(){
		//server is starting and log is initialized
	},
	'log':function(type,data){
		//you got a message from the process
	},
	'die':function(){
		//server died or was killed
	}
}
```

the types of message you can get are the following:

 - message (you can get whatever you send as data)
 - exit
   * status (int)
 - uncaughtException
   * err (Error)
 - instanceExit
   * status (int)
   * port (int)
 - instanceUncaughtException
   * port (int)
   * err (Error)
 - instanceRespawn
   * port (int)
 - instanceRestart
   * port (int)
 - instanceKill
   * port (int)

## The process

When you have your fresh copy of this base server the actions you should do are the following:

 1. Make sure nginx is installed
 2. Run `npm install`
 3. Modify the files in servers as required by you
 4. Run `bash nginx.sh` in order to update nginx configuration
 5. Test one of your server by running `bash test.sh myserver.com` if you're local testing, remember to add the /etc/hosts entry
 6. Start one of the servers by running `bash start.sh myserver.com` it will detach your console and create a process file
 7. List your active servers with `bash list.sh`
 8. Kill your server with `bash stop.sh myserver.com`
 9. Add a automated script to run `bash respawn.sh` in the directory of the scripts
 10. Start one server again and turn off your computer electricity, or cause a kernel panic, or just kill the process of the master process abruptly.
 11. Restart your computer, or just run `respawn.sh` and the server should be back to life.

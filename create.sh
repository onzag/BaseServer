if [ -z ${1+x} ]; then
	echo "plese insert a server name";
	exit 1
fi

name="$1"
cd servers
mkdir "$name"
cd "$name"

npm init
cat << EOF > config.js
module.exports = {

	// This will set the X-Robots-Tag to 'noindex, nofollow' in order
	// to make the whole content hidden for search egines
	HIDDEN:false,

	// This will set the page for the error 404 when searching into an static directory
	// Leave it null in order to avoid such redirect and just show the standard 404 call
	// from nginx
	ERR404:null,

	// This will set the page for error 502 when nginx fails to connect to one of the
	// Node.js instances that will be running
	ERR502:null,

	// THE DYNAMIC PART OF THE SERVER, REMOVE IT TO AVOID MAKING IT DYNAMIC
	// WHEN A SERVER IS NOT DYNAMIC THERE'S NO POINT IN RUNNING start.sh ON IT
	DYNAMIC:{

		// MAKE MORE OF THESE SERVERS IF YOU WANT MORE INSTANCES
		// REMEMBER THAT AS YOU MODIFY THE NGINX CONFIGURATION HAS TO BE CHANGED
		// AS WELL AS reload.sh MUST BE RUN IN THE TARGET SERVER IN ORDER TO CREATE
		// THE NEW PROCESSES, IN ORDER TO MAKE IT EASIER FOR THE SERVER, RUN reload.sh BEFORE nginx.sh

		// NOTE THAT ONLY LOCALHOST IS CONSIDERED LOCAL, ANY IP EVEN THE 127.0.0.1 WILL BE CONSIDERED
		// A REDIRECTION OUT OF THE REACH OF THE HANDLER
		HOST:[{
			host:'localhost',
			port:8000
		},{
			host:'localhost',
			port:8001
		}],

		// URL THAT WILL BE USED FOR REDIRECTION
		URL:'/dynamic/'
	},

	// THE STATIC PART OF THE SERVER, REMOVE IT TO AVOID MAKING ANY STATIC REQUESTS
	// REMEMBER THAT FOR ANY UPDATE YOU HAVE TO RUN nginx.sh
	STATIC:{

		// THE URL THAT WILL BE USED FOR STATIC FILES, SINCE IT HAS LESS PRIORITY THAN THE DYNAMIC
		// IT IS THE SECOND TO CATCH

		//YOU CAN SET IT AS AN ARRAY FOR SEVERAL CATCHES
		URL:'/',

		// THE FOLDER THAT WILL CARRY THE STATIC CONTENT
		FOLDER:'contents',

		// THE LIFETIME OF THE CACHE
		LIFETIME:'1d',

		// SOME ADITIONAL HEADERS
		HEADERS:{}
	}
}
EOF

cat << EOF > handler.js
module.exports = function(app,done,test){
	app.get('/dynamic/ping',function(req,res){

		// Send log messages, any type supported
		process.send('getting pinged')

		if (test){
			res.end('pong (test mode)');
		} else {
			res.end('pong');
		}
	});

	// Callback error if required
	done(null);
}

//Minitest fallback (add express to your devDependencies if you want this behaviour)
function main(){
	var express = require('express');
	var app = express();

	module.exports(app,function(err){
		if (err){
			throw err;
		} else {
			app.listen(process.argv[2] || 8000);
		}
	},true);

	process.on('SIGINT',function(){
		app.close(function(){
			process.exit(0);
		});
	});
	process.send = console.log;
}

if (require.main === module) {
    main();
}

EOF

mkdir contents
cd contents

cat << EOF > index.html
<DOCTYPE !html>
<html>
	<body>Hello World!</body>
</html>
EOF

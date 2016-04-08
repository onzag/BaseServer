var fs = require('fs');

var ssl = {};

fs.readdirSync('./security').forEach(function(folder){
	var stat = fs.statSync('./security/' + folder);
	if (stat.isDirectory()){
		ssl[folder] = {};
		fs.readdirSync('./security/' + folder).forEach(function(file){
			var stat = fs.statSync('./security/' + folder + '/' + file);
			if (stat.isFile()){
				if (file.indexOf('.key', this.length - 4) !== -1){
					ssl[folder].key = '/security/' + folder + '/' + file;
				} else if (file.indexOf('.crt', this.length - 4) !== -1) {
					ssl[folder].crt = '/security/' + folder + '/' + file;
				}
			}
		})
	}
});

var router = "";
var prerouter = "";
fs.readdirSync('./servers').forEach(function(domain){

	if (domain.indexOf('.') === 0){
		return;
	}

	var ssldata;
	for (regex in ssl){
		var nregex = "^" + regex.replace(/\*/,'\\w+').replace(/\./,'\\.') + "$";
		if ((new RegExp(nregex)).test(domain) && ssl[regex].crt && ssl[regex].key){
			ssldata = ssl[regex];
			break;
		}
	}
	var config = require('../servers/' + domain + '/config.js');
	if (ssldata){
		router += "server {\n\tlisten 80;\n\tserver_name " + domain + ";\n\treturn 301 https://$server_name$request_uri;\n}\n";
		router += "server {\n\tlisten 443 ssl spdy;\n\tserver_name " + domain + ";";
		router += "\n\tssl_certificate " + process.cwd() + ssldata.crt + 
				";\n\tssl_certificate_key " + process.cwd() + ssldata.key + ";\n\tssl_protocols TLSv1 TLSv1.1 TLSv1.2;";
	} else {
		router += "server {\n\tlisten 80;\n\tserver_name " + domain + ";";
	}
	
	if (config.DYNAMIC){
		if (!(config.DYNAMIC.URL instanceof Array)){
			config.DYNAMIC.URL = [config.DYNAMIC.URL];
		}

		var hosts = (config.DYNAMIC.HOST instanceof Array) ? config.DYNAMIC.HOST : [config.DYNAMIC.HOST];
		hosts = hosts.map(function(e){return e.host + ':' + e.port})

		prerouter += "upstream serv." + domain + " {";
		prerouter += "\n\tleast_conn;\n\tserver ";
		prerouter += hosts.join(';\n\tserver ') + ";\n}\n";

		config.DYNAMIC.URL.forEach(function(dyn){
			if (dyn instanceof RegExp){
				router += "\n\tlocation ~ " + dyn.source + " {";
			} else {
				router += "\n\tlocation " + dyn + " {";
			}

			router += "\n\t\tproxy_pass http://serv." + domain  + ";" +
				"\n\t\tproxy_http_version 1.1;" +
				"\n\t\tproxy_set_header Upgrade $http_upgrade;" +
				"\n\t\tproxy_set_header Connection 'upgrade';" +
				"\n\t\tproxy_set_header Host $host;" +
				"\n\t\tproxy_set_header X-NginX-Proxy true;" +
				(config.HIDDEN ? "\n\t\tproxy_set_header X-Robots-Tag 'noindex, nofollow';" : "") +
				(config.ERR404 ? ("\n\t\terror_page 404 " + config.ERR404 + ";") : "") +
				(config.ERR502 ? ("\n\t\terror_page 502 " + config.ERR502 + ";") : "") +
				(config.MAX ? ("\n\t\tclient_max_body_size " + config.MAX + "M;") : "") +
				"\n\t\tproxy_cache_bypass $http_upgrade;\n\t}";
		});
	}

	if (config.STATIC){

		if (!(config.STATIC.URL instanceof Array)){
			config.STATIC.URL = [config.STATIC.URL];
		}

		config.STATIC.URL.forEach(function(st,index){
			if (st instanceof RegExp){
				router += "\n\tlocation ~ " + st.source + " {";
			} else {
				router += "\n\tlocation " + st + " {";
			}

			router += '\n\t\tcharset utf-8;';

			var lifetime = config.STATIC.LIFETIME || "1d";
			if (config.STATIC.LIFETIME instanceof Array){
				if (config.STATIC.LIFETIME.length !== config.STATIC.URL.length){
					console.error('STATIC LIFETIME array length is not the same as STATIC URL');
					process.exit(1);
				}
				lifetime = config.STATIC.LIFETIME[index];
			}
			if (!lifetime){
				console.warn('STATIC LIFETIME was not specified, setting it to 1 day');
			}

			var folder = config.STATIC.FOLDER;
			if (config.STATIC.FOLDER instanceof Array){
				if (config.STATIC.FOLDER.length !== config.STATIC.URL.length){
					console.error('STATIC FOLDER array length is not the same as STATIC URL');
					process.exit(1);
				}
				folder = config.STATIC.FOLDER[index];
			}
			if (!folder){
				console.error('STATIC FOLDER was not specified');
				process.exit(1);
			}
			
			router += (lifetime ? "\n\t\texpires " + JSON.stringify(lifetime) + ";" : "") + 
				"\n\t\troot " + process.cwd() + "/servers/" + domain + "/" + folder + ";" +
				(config.HIDDEN ? "\n\t\tproxy_set_header X-Robots-Tag 'noindex, nofollow';" : "") +
				(config.ERR404 ? ("\n\t\terror_page 404 " + config.ERR404 + ";") : "") +
				(config.ERR502 ? ("\n\t\terror_page 502 " + config.ERR502 + ";") : "");

			var headers = config.STATIC.HEADERS || {};
			if (config.STATIC.HEADERS instanceof Array){
				headers = config.STATIC.HEADERS[index];
			}

			if (headers){
				Object.keys(headers).forEach(function(header){
					router += "\n\t\tadd_header " + JSON.stringify(header) + " " + JSON.stringify(headers[header]) + ";";
				});
			}

			router += "\n\t\tadd_header Pragma public;" +
	   			"\n\t\tadd_header Cache-Control \"public\";\n\t}";
		});
	}

	router += "\n}\n";

});
console.log(prerouter + router);

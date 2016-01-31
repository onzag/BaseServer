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
		if (!(config.DYNAMICURL instanceof Array)){
			config.DYNAMICURL = [config.DYNAMICURL];
		}

		config.DYNAMICURL.forEach(function(dyn){
			if (dyn instanceof RegExp){
				router += "\n\tlocation ~ " + dyn.source + " {";
			} else {
				router += "\n\tlocation " + dyn + " {";
			}

			hosts = (config.DYNAMICHOST instanceof Array) ? config.DYNAMICHOST : [config.DYNAMICHOST];
			hosts = hosts.map(function(e){return e.host + ':' + e.port})

			prerouter += "upstream serv." + domain + " {";
			prerouter += "\n\tleast_conn;\n\tserver ";
			prerouter += hosts.join(';\n\tserver ') + ";\n}\n";

			router += "\n\t\tproxy_pass http://serv." + domain  + ";" +
				"\n\t\tproxy_http_version 1.1;" +
				"\n\t\tproxy_set_header Upgrade $http_upgrade;" +
				"\n\t\tproxy_set_header Connection 'upgrade';" +
				"\n\t\tproxy_set_header Host $host;" +
				"\n\t\tproxy_set_header X-NginX-Proxy true;" +
				(config.HIDDEN ? "\n\t\tproxy_set_header X-Robots-Tag 'noindex, nofollow';" : "") +
				(config.ERR404 ? ("\n\t\terror_page 404 " + config.ERR404 + ";") : "") + 
				"\n\t\tproxy_cache_bypass $http_upgrade;\n\t}";
		});
	}

	if (config.STATIC){

		if (!(config.STATICURL instanceof Array)){
			config.STATICURL = [config.STATICURL];
		}

		config.STATICURL.forEach(function(st,index){
			if (st instanceof RegExp){
				router += "\n\tlocation ~ " + st.source + " {";
			} else {
				router += "\n\tlocation " + st + " {";
			}

			var lifetime = config.STATICLIFETIME;
			if (config.STATICLIFETIME instanceof Array){
				lifetime = config.STATICLIFETIME[index];
			}

			var folder = config.STATICFOLDER;
			if (config.STATICLIFETIME instanceof Array){
				folder = config.STATICFOLDER[index];
			}
			
			router += (lifetime ? "\n\t\texpires " + JSON.stringify(lifetime) + ";" : "") + 
				"\n\t\troot " + process.cwd() + "/servers/" + domain + "/" + folder + ";" +
				(config.ERR404 ? ("\n\t\terror_page 404 " + config.ERR404 + ";") : "") +
				(config.ERR502 ? ("\n\t\terror_page 502 " + config.ERR502 + ";") : "");

			var headers = config.STATICHEADERS;
			if (config.STATICHEADERS instanceof Array){
				headers = config.STATICHEADERS[index];
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

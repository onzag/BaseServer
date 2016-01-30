#!/bin/bash
user=$(whoami);
if [ "$user" != "root" ]; then
	echo "this script must run as root"
else
	echo "configuring nginx"
	node ./bin/nginx.js > /etc/nginx/sites-enabled/default
	nginxpid=`cat /run/nginx.pid`
	echo "performing graceful restart"
	kill -HUP "$nginxpid"
	echo "checking config"
	nginx -t
fi

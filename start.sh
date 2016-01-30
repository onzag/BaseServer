#!/bin/bash
if [ -z ${1+x} ]; then
	echo "plese insert a server name";
elif [ -f "./process/$1" ]; then
	echo "Server $1 is already up and running"
else
	echo "starting $1"
	nohup node ./bin/start.js $1 >/dev/null 2>&1 &
fi

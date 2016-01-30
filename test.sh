#!/bin/bash
if [ -z ${1+x} ]; then
	echo "plese insert a server name";
else
	echo "starting $1 in test mode"
	node ./bin/start.js $1 t
fi

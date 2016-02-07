#!/bin/bash
if [ -z ${1+x} ]; then
	echo "plese insert a server name";
elif [ -z ${2+x} ]; then
	echo "please insert a port name"
else
	echo "microtesting $1"
	node ./bin/init.js "$1" "$2" mt
fi

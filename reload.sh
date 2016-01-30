if [ -z ${1+x} ]; then
	echo "plese insert a server name";
else
	pid=$(cat "./process/$1")
	echo "reloading master server at $pid"
	kill -HUP $pid
fi

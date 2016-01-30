if [ -z ${1+x} ]; then
	echo "plese insert a server name";
else
	pid=$(cat "./process/$1")
	echo "killing master server at $pid"
	kill -INT $pid
	rm "./process/$1" >/dev/null 2>&1
fi

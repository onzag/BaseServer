if [ "$(ls ./process)" ]; then
	printf '%s\t%s\t%s\n' "server name" "pid"
	for file in ./process/*; do { read -r a;} < "$file"; printf '%s\t%s\n' "${file##*/}" "$a"; done
else
	printf "Nothing to show\n"
fi

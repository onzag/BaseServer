if [ "$(ls -A ./process)" ]; then
	for file in ./process/*; do rm "$file"; bash start.sh "${file##*/}"; done
fi

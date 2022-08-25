PPWD=$(pwd)
cd "$HOME"/project/.logs || exit
for i in *.log
do
    if [ -f "$i" ]
    then
        NOW=$(date +%Y-%m-%dT%H.%M.%S)
        BASENAME=$(basename "$i" .log)
        TEMPNAME="$BASENAME-$NOW.log"

        mkdir -p "$NOW"
        mv "$i" "$TEMPNAME"
        touch "$i"
        gzip "$TEMPNAME" -S.gz
        mv "$TEMPNAME" "$NOW/$TEMPNAME"
    fi
done
cd "$PPWD" || exit

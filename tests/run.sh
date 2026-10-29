#!/bin/bash
# Run one test case (tests/cases/<name>.js) in headless Chrome and print its log.
#   tests/run.sh <name> [seconds]
. "$(dirname "$0")/lib.sh"
NAME=$1; SECS=${2:-90}
[ -f "$T/cases/$NAME.js" ] || { echo "no test called $NAME" >&2; exit 2; }
rm -f "$OUT/$NAME.txt"
start_server
P=$(new_profile "$NAME")
"$CHROME" --headless=new --disable-gpu --autoplay-policy=no-user-gesture-required --window-size=420,900 --user-data-dir="$P" "$URL/tests/harness.html?t=$NAME" >/dev/null 2>&1 &
PID=$!
for _ in $(seq 1 "$SECS"); do [ -f "$OUT/$NAME.txt" ] && break; sleep 1; done
stop_chrome "$P" "$PID"
cat "$OUT/$NAME.txt" 2>/dev/null || echo "NO RESULT after ${SECS}s"

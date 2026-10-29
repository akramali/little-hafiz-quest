#!/bin/bash
# Several screens side by side in one picture (each a "view" case query):
#   tests/grid.sh worlds "v=map&scroll=0|v=map&scroll=900" [columns] [height]   → tests/out/grid-worlds.png
# The frames share one browser profile, so give settings-dependent screens their own shot.sh instead.
. "$(dirname "$0")/lib.sh"
NAME=$1; V=$2; C=${3:-4}; H=${4:-420}
N=$(echo "$V" | tr '|' '\n' | wc -l); ROWS=$(( (N + C - 1) / C ))
start_server
ENC=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))" "$V")
FILE="grid-$NAME.png"
P=$(new_profile grid)
timeout 120 "$CHROME" --headless=new --disable-gpu --hide-scrollbars --user-data-dir="$P" --window-size=$((C * 394)),$((ROWS * (H + 4))) --virtual-time-budget=$((N * 2500 + 8000)) --screenshot="$(shot_target "$FILE")" "$URL/tests/grid.html?c=$C&h=$H&v=$ENC" >/dev/null 2>&1
stop_chrome "$P"
shot_collect "$FILE"

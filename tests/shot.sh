#!/bin/bash
# Screenshot a test page, usually the "view" case (any screen) or "readme" (the README pictures):
#   tests/shot.sh view "v=map&scroll=900" [width] [height]      → tests/out/view-v_map_scroll_900.png
#   tests/shot.sh readme "shot=splash" 390 844
# SCALE=1 for a 1× picture (default 2×); VT=<ms> of page time before the picture (default 6000).
. "$(dirname "$0")/lib.sh"
NAME=$1; Q=$2; W=${3:-390}; H=${4:-844}
start_server
FILE="$NAME${Q:+-$(echo "$Q" | tr -c 'a-zA-Z0-9' '_' | sed 's/_*$//')}.png"
P=$(new_profile shot)
timeout 90 "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor="${SCALE:-2}" --user-data-dir="$P" --window-size="$W,$H" --virtual-time-budget="${VT:-6000}" --screenshot="$(shot_target "$FILE")" "$URL/tests/harness.html?t=$NAME&$Q" >/dev/null 2>&1
stop_chrome "$P"
shot_collect "$FILE"

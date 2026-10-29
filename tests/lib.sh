# Shared by the test scripts: where things are, the test server, and headless Chrome.
# Chrome: $CHROME if set; else Windows Chrome under WSL, or google-chrome / chromium / macOS Chrome.
ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
T="$ROOT/tests"
OUT="$T/out"
PORT=${PORT:-8765}
URL="http://localhost:$PORT"
mkdir -p "$OUT"
WSL=
grep -qi microsoft /proc/version 2>/dev/null && WSL=1
if [ -z "$CHROME" ]; then
  if [ -n "$WSL" ]; then
    CHROME="/mnt/c/Program Files/Google/Chrome/Application/chrome.exe"
  else
    for c in google-chrome google-chrome-stable chromium chromium-browser "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"; do
      if [ -x "$c" ]; then CHROME=$c; break; fi
      if command -v "$c" >/dev/null 2>&1; then CHROME=$(command -v "$c"); break; fi
    done
  fi
fi
if [ ! -x "$CHROME" ]; then echo "Chrome not found: set CHROME=/path/to/chrome" >&2; exit 2; fi
# Windows Chrome (WSL) needs Windows paths for its profile and screenshots: it uses C:\Temp
[ -n "$WSL" ] && mkdir -p /mnt/c/Temp

start_server() {
  curl -s -o /dev/null "$URL/" 2>/dev/null && return
  (python3 "$T/server.py" "$ROOT" "$OUT" "$PORT" >/dev/null 2>&1 &)
  for _ in 1 2 3 4 5 6 7 8 9 10; do curl -s -o /dev/null "$URL/" 2>/dev/null && return; sleep 0.3; done
}
# a fresh browser profile for one run (no stored progress, no service worker)
new_profile() {
  if [ -n "$WSL" ]; then echo "C:\\Temp\\lhq-$1-$RANDOM$RANDOM"; else mktemp -d "${TMPDIR:-/tmp}/lhq-$1-XXXXXX"; fi
}
# where Chrome writes a screenshot, and where it ends up
shot_target() { if [ -n "$WSL" ]; then echo "C:\\Temp\\$1"; else echo "$OUT/$1"; fi; }
shot_collect() { [ -n "$WSL" ] && [ -f "/mnt/c/Temp/$1" ] && mv -f "/mnt/c/Temp/$1" "$OUT/$1"; echo "$OUT/$1"; }
stop_chrome() { # profile, pid
  if [ -n "$WSL" ]; then
    powershell.exe -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='chrome.exe'\" | Where-Object { \$_.CommandLine -like '*$1*' } | ForEach-Object { Stop-Process -Id \$_.ProcessId -Force -ErrorAction SilentlyContinue }" >/dev/null 2>&1
  else
    pkill -f -- "$1" 2>/dev/null; [ -n "$2" ] && kill "$2" 2>/dev/null
    case "$1" in /*lhq-*) rm -rf "$1" ;; esac
  fi
}

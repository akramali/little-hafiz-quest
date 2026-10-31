#!/bin/bash
# Focused browser tests: run the tests of the game areas a change touched.
#   tests/t.sh map gifts     the tests of those areas (or tests by name), 3 at a time, one line each
#   tests/t.sh list          the areas and their tests
#   tests/t.sh all           everything (for major releases, ~5 minutes)
# Each test checks itself (ok(...)) and ends with "RESULT PASS n/n" or "RESULT FAIL"; full logs in tests/out/<test>.txt.
# J=<n> runs n at a time (default 3).
. "$(dirname "$0")/lib.sh"
J=${J:-3}
declare -A AREA=(
  [core]="smoke"
  [map]="fruit face pals tag excite props walkgift v258 v260 v261"
  [gifts]="gifts giftflow giftrun walkgift drops v257 v260 v261"
  [learn]="chain chain2 loop v257 v260 v267"
  [words]="v242 smoke v267"
  [stones]="stones v267"
  [puzzle]="puzzle ghost v242 v258"
  [read]="mushaf focus v257 v260"
  [explorers]="hold sync sync1 pals"
  [sync]="sync sync1"
  [bag]="v241 v242 drops v258 v261"
  [settings]="speed v257"
  [audio]="loop speed dl v260 v267"
  [updates]="update"
  [awards]="show"
  [files]="v241"
  [art]="allgifts face props"
  [layout]="hit contrast"
  [buttons]="buttons"
  [stranger]="stranger stakes v261"
)
declare -A SECS=([dl]=280 [buttons]=500 [allgifts]=150 [face]=240 [stakes]=120 [contrast]=150 [pals]=90)
if [ -z "$1" ] || [ "$1" = list ]; then for a in "${!AREA[@]}"; do printf '  %-10s %s\n' "$a" "${AREA[$a]}"; done | sort; exit; fi
tests=()
for x in "$@"; do
  if [ "$x" = all ]; then for a in "${!AREA[@]}"; do tests+=(${AREA[$a]}); done
  elif [ -n "${AREA[$x]}" ]; then tests+=(${AREA[$x]})
  else tests+=("$x"); fi
done
tests=($(printf '%s\n' "${tests[@]}" | awk '!s[$0]++')) # each once
start_server
one() {
  local t=$1 s=$(date +%s)
  bash "$T/run.sh" "$t" "${SECS[$t]:-90}" >/dev/null 2>&1
  local r=$(grep -m1 '^RESULT' "$OUT/$t.txt" 2>/dev/null) secs=$(( $(date +%s) - s ))
  if [[ "$r" == "RESULT PASS"* ]]; then echo "✓ $t ${r#RESULT PASS } (${secs}s)"
  elif [ -z "$r" ]; then echo "✗ $t: no result (${secs}s)"
  else echo "✗ $t ${r#RESULT FAIL } (${secs}s)"; sed -n '/^RESULT/,$p' "$OUT/$t.txt" | grep '✗'; fi
}
# the update test makes the server announce a newer version: it runs on its own, first
par=()
for t in "${tests[@]}"; do if [ "$t" = update ]; then one update; else par+=("$t"); fi; done
running=0
for t in "${par[@]}"; do
  one "$t" > "$OUT/.line-$t" &
  running=$((running + 1))
  if [ $running -ge "$J" ]; then wait -n; running=$((running - 1)); fi
done
wait
fails=0
for t in "${par[@]}"; do cat "$OUT/.line-$t"; grep -q '^✗' "$OUT/.line-$t" && fails=$((fails + 1)); rm -f "$OUT/.line-$t"; done
exit $fails

#!/usr/bin/env bash
# Estimates Antigravity "time spent" from ~/.gemini/antigravity/brain/ file timestamps.
# Run on your machine:
#   bash code/dashboard/scripts/antigravity-session-stats.sh
#   bash code/dashboard/scripts/antigravity-session-stats.sh --since 2024-12-13 --until 2026-01-06
# Output: conversation count, estimated total hours, date range (first/last session).

set -e
BRAIN="${HOME}/.gemini/antigravity/brain"
SINCE_EPOCH=""
UNTIL_EPOCH=""
SINCE_ARG=""
UNTIL_ARG=""

date_to_epoch() {
  local d="$1"
  if [[ "$(uname -s)" == "Darwin" ]]; then
    date -j -f "%Y-%m-%d" "$d" "+%s" 2>/dev/null || echo ""
  else
    date -d "$d 00:00:00" "+%s" 2>/dev/null || echo ""
  fi
}
date_to_epoch_end() {
  local d="$1"
  if [[ "$(uname -s)" == "Darwin" ]]; then
    date -j -f "%Y-%m-%d %H:%M:%S" "${d} 23:59:59" "+%s" 2>/dev/null || date -j -f "%Y-%m-%d" "$d" "+%s" 2>/dev/null || echo ""
  else
    date -d "$d 23:59:59" "+%s" 2>/dev/null || echo ""
  fi
}

while [[ $# -gt 0 ]]; do
  case $1 in
    --since) SINCE_ARG="$2"; SINCE_EPOCH=$(date_to_epoch "$2"); shift 2 ;;
    --until) UNTIL_ARG="$2"; UNTIL_EPOCH=$(date_to_epoch_end "$2"); shift 2 ;;
    *) echo "Usage: $0 [--since YYYY-MM-DD] [--until YYYY-MM-DD]"; exit 1 ;;
  esac
done

if [[ ! -d "$BRAIN" ]]; then
  echo "Antigravity brain not found at: $BRAIN"
  exit 1
fi

total_sec=0
count=0
global_min=""
global_max=""

stat_mtime() {
  if [[ "$(uname -s)" == "Darwin" ]]; then
    stat -f %m "$1" 2>/dev/null || echo ""
  else
    stat -c %Y "$1" 2>/dev/null || echo ""
  fi
}

for dir in "$BRAIN"/*/; do
  [[ -d "$dir" ]] || continue
  min_t="" max_t=""
  while IFS= read -r -d '' f; do
    t=$(stat_mtime "$f")
    [[ -z "$t" ]] && continue
    if [[ -z "$min_t" ]] || [[ "$t" -lt "$min_t" ]]; then min_t=$t; fi
    if [[ -z "$max_t" ]] || [[ "$t" -gt "$max_t" ]]; then max_t=$t; fi
  done < <(find "$dir" -type f -print0 2>/dev/null)
  if [[ -z "$min_t" ]] || [[ -z "$max_t" ]] || [[ "$max_t" -lt "$min_t" ]]; then continue; fi
  # Date filter: include session if it overlaps [SINCE_EPOCH, UNTIL_EPOCH]
  if [[ -n "$SINCE_EPOCH" ]] && [[ "$max_t" -lt "$SINCE_EPOCH" ]]; then continue; fi
  if [[ -n "$UNTIL_EPOCH" ]] && [[ "$min_t" -gt "$UNTIL_EPOCH" ]]; then continue; fi
  count=$((count + 1))
  dur=$((max_t - min_t))
  total_sec=$((total_sec + dur))
  if [[ -z "$global_min" ]] || [[ "$min_t" -lt "$global_min" ]]; then global_min=$min_t; fi
  if [[ -z "$global_max" ]] || [[ "$max_t" -gt "$global_max" ]]; then global_max=$max_t; fi
done

hours=$((total_sec / 3600))
remainder_sec=$((total_sec % 3600))
mins=$((remainder_sec / 60))

echo "--- Antigravity session stats (this machine) ---"
[[ -n "$SINCE_ARG" ]] && echo "Filter --since: $SINCE_ARG"
[[ -n "$UNTIL_ARG" ]] && echo "Filter --until: $UNTIL_ARG"
echo "Conversations (sessions): $count"
echo "Estimated time in sessions: ${hours}h ${mins}m (total ${total_sec} seconds)"
if [[ -n "$global_min" ]] && [[ -n "$global_max" ]]; then
  if [[ "$(uname -s)" == "Darwin" ]]; then
    echo "First session (earliest file): $(date -r "$global_min" '+%Y-%m-%d %H:%M')"
    echo "Last session (latest file):   $(date -r "$global_max" '+%Y-%m-%d %H:%M')"
  else
    echo "First session (earliest file): $(date -d "@$global_min" '+%Y-%m-%d %H:%M')"
    echo "Last session (latest file):   $(date -d "@$global_max" '+%Y-%m-%d %H:%M')"
  fi
fi
echo "--- Paste the line below into docs/ANTIGRAVITY_STATS.md or founder-collab ---"
echo "Antigravity: $count sessions, ~${hours}h estimated (from brain/ file timestamps)."

#!/usr/bin/env bash
# Breaks down Antigravity sessions by day-of-week and hour-of-day (from brain/ file mtimes).
# Run: bash code/dashboard/scripts/antigravity-session-breakdown.sh
# Output: which days you work most, which hours you're most active (session-start proxy).

set -e
BRAIN="${HOME}/.gemini/antigravity/brain"

if [[ ! -d "$BRAIN" ]]; then
  echo "Antigravity brain not found at: $BRAIN"
  exit 1
fi

stat_mtime() {
  if [[ "$(uname -s)" == "Darwin" ]]; then
    stat -f %m "$1" 2>/dev/null || echo ""
  else
    stat -c %Y "$1" 2>/dev/null || echo ""
  fi
}

# Use session start (min mtime per folder) as proxy for "when you worked"
# Day 0=Sun, 6=Sat; Hour 0-23
declare -a day_sec=(0 0 0 0 0 0 0)
declare -a hour_sec=(0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0)
total_sec=0
count=0

for dir in "$BRAIN"/*/; do
  [[ -d "$dir" ]] || continue
  count=$((count + 1))
  min_t="" max_t=""
  while IFS= read -r -d '' f; do
    t=$(stat_mtime "$f")
    [[ -z "$t" ]] && continue
    if [[ -z "$min_t" ]] || [[ "$t" -lt "$min_t" ]]; then min_t=$t; fi
    if [[ -z "$max_t" ]] || [[ "$t" -gt "$max_t" ]]; then max_t=$t; fi
  done < <(find "$dir" -type f -print0 2>/dev/null)
  if [[ -z "$min_t" ]] || [[ -z "$max_t" ]] || [[ "$max_t" -lt "$min_t" ]]; then continue; fi
  dur=$((max_t - min_t))
  total_sec=$((total_sec + dur))
  # Session "start" = min_t (when first file in that session was touched)
  if [[ "$(uname -s)" == "Darwin" ]]; then
    day=$(date -r "$min_t" '+%u')  # 1=Mon .. 7=Sun
    hour=$(date -r "$min_t" '+%H')
  else
    day=$(date -d "@$min_t" '+%u')
    hour=$(date -d "@$min_t" '+%H')
  fi
  # %u: 1=Mon .. 7=Sun. We want index 0=Sun, 1=Mon, .. 6=Sat -> d = day % 7
  d=$((day % 7))
  day_sec[$d]=$((${day_sec[$d]} + dur))
  h=$((10#$hour))
  hour_sec[$h]=$((${hour_sec[$h]} + dur))
done

hours=$((total_sec / 3600))
echo "--- Antigravity: session breakdown (this machine) ---"
echo "Sessions: $count  |  Total estimated time: ${hours}h"
echo ""
echo "By day of week (session time; 0=Sun, 1=Mon, ..., 6=Sat):"
days=(Sun Mon Tue Wed Thu Fri Sat)
for i in 0 1 2 3 4 5 6; do
  h=$(( ${day_sec[$i]} / 3600 ))
  m=$(( (${day_sec[$i]} % 3600) / 60 ))
  printf "  %s: %3dh %02dm\n" "${days[$i]}" "$h" "$m"
done
echo ""
echo "By hour of day (UTC session time; 0=midnight, 12=noon):"
for i in $(seq 0 23); do
  h=$(( ${hour_sec[$i]} / 3600 ))
  m=$(( (${hour_sec[$i]} % 3600) / 60 ))
  printf "  %02d:00: %3dh %02dm\n" "$i" "$h" "$m"
done
echo ""
echo "Note: Times are from file mtimes in brain/ (when artifacts were written). Timezone = your local."

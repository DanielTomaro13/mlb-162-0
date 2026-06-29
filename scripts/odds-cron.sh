#!/bin/bash
# MLB odds scraper — runs from an AU IP (the AU books geo-block GitHub's US runners,
# so this can't live in CI). Runs the MLB-Modelling odds engine (all 5 books when
# creds are present), copies the feeds into the site, commits and pushes to main
# (which triggers the GitHub Pages deploy). Mirrors AFL-23-0/scripts/odds-cron.sh.
#
# Driven by a launchd agent every 3h. Bookmaker creds (TAB_*, DABBLE_*) live in
# $MODEL_DIR/.env and are sourced before the scrape.
set -uo pipefail

# launchd runs with a minimal PATH — add Homebrew (python/git) explicitly.
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# The MLB-Modelling Python repo (override with MODEL_DIR if it lives elsewhere).
MODEL_DIR="${MODEL_DIR:-$HOME/Documents/Projects/MLB-Model}"
# Shared bookmaker creds (TAB_CLIENT_ID/SECRET/ACCESS_TOKEN, DABBLE_* …) — the same
# secrets.env the AFL/NRL/Tennis odds crons source. Override with CREDS_ENV.
# MLB-Model/.env (if present) is also sourced for any MLB-specific overrides.
CREDS_ENV="${CREDS_ENV:-$HOME/sports-bots/secrets.env}"
cd "$REPO" || exit 1
LOG="$REPO/scripts/odds-cron.log"
ts() { date "+%Y-%m-%d %H:%M:%S"; }
exec >>"$LOG" 2>&1
echo "===== $(ts) mlb odds-cron start (repo=$REPO model=$MODEL_DIR) ====="

# Latest main first (CI commits model refreshes here) so the push fast-forwards.
git pull --rebase --autostash origin main || { echo "$(ts) pull failed"; exit 1; }

# Run the odds engine in the model repo (loads TAB/Dabble creds from its .env).
( cd "$MODEL_DIR" || exit 1
  # Pull CI's latest model (fresh profiles + fixtures) so odds price against current data.
  git pull --rebase --autostash 2>/dev/null || true
  set -a
  [ -f "$CREDS_ENV" ] && . "$CREDS_ENV"   # shared TAB/Dabble creds (other sports use this)
  [ -f .env ] && . ./.env                 # any MLB-specific overrides
  set +a
  echo "$(ts) creds: TAB=${TAB_CLIENT_ID:+set} DABBLE=${DABBLE_AUTH:+set}"
  python3 -m src.predict   # refresh predictions from the current profiles
  python3 -m src.odds
) || { echo "$(ts) odds scrape failed"; exit 1; }

# Copy the model odds + pick'em feeds into the site's public data.
cp "$MODEL_DIR/docs/data/odds.json"          web/public/data/model-odds.json          2>/dev/null || true
cp "$MODEL_DIR/docs/data/predictions.json"   web/public/data/model-predictions.json   2>/dev/null || true
[ -f "$MODEL_DIR/docs/data/pickem-lines.json" ] && cp "$MODEL_DIR/docs/data/pickem-lines.json" web/public/data/model-pickem-lines.json

git add web/public/data/model-odds.json web/public/data/model-pickem-lines.json web/public/data/model-predictions.json
if git diff --cached --quiet; then
  echo "$(ts) no odds changes — nothing to push"; exit 0
fi
git config user.name  "mlb-odds-bot"
git config user.email "mlb-odds-bot@localhost"
git commit -m "Refresh MLB odds (local AU scrape $(date -u +%Y-%m-%dT%H:%MZ))"

# Push with rebase-retry in case CI pushed in the meantime.
for i in 1 2 3 4 5; do
  if git push origin HEAD:main; then echo "$(ts) pushed (attempt $i)"; exit 0; fi
  echo "$(ts) push rejected (attempt $i) — rebasing..."
  git pull --rebase --autostash origin main || { echo "$(ts) rebase failed"; exit 1; }
done
echo "$(ts) failed to push after 5 attempts"; exit 1

#!/bin/bash
# Auto-enqueue pipeline jobs. Runs via cron.
cd /srv/agents/crypto-tuber-ranked
source .env.hermes
export DATABASE_URL

# Enqueue if no pending jobs of this type exist
enq_if_empty() {
  local type=$1 priority=$2
  local pending=$(psql "$DATABASE_URL" -t -A -c "SELECT COUNT(*) FROM pipeline_jobs WHERE type='$type' AND status='pending'")
  if [ "$pending" = "0" ]; then
    psql "$DATABASE_URL" -c "INSERT INTO pipeline_jobs (type, priority, status, run_after) VALUES ('$type', $priority, 'pending', NOW())" > /dev/null
    echo "[+]$type enqueued"
  else
    echo "[-]$type: $pending pending already"
  fi
}

# Reset stale jobs
psql "$DATABASE_URL" -c "UPDATE pipeline_jobs SET status='pending', locked_by=NULL, locked_at=NULL, heartbeat_at=NULL, run_after=NOW() WHERE status='running' AND (heartbeat_at IS NULL OR heartbeat_at < NOW() - INTERVAL '30 minutes')" > /dev/null

# Enqueue in priority order
enq_if_empty ml_verifier_batch 100
enq_if_empty candle_refresh 90
enq_if_empty match_prices_batch 80
enq_if_empty compute_scores 70

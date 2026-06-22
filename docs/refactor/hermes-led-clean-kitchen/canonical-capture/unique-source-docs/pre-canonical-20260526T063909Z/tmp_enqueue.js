const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const sql = neon(process.env.DATABASE_URL);
  const [run] = await sql`
    INSERT INTO pipeline_runs (run_key, type, status)
    VALUES ('phase3_candle_dry_btcusdt', 'candle-refresh', 'running')
    ON CONFLICT (run_key) DO UPDATE SET status = 'running'
    RETURNING id;
  `;

  const payload = JSON.stringify({
    symbols: ["BTCUSDT"],
    max_requests_per_symbol: 3,
    gap_ms: 250,
    write: false,
    dry_run: true
  });

  await sql`
    INSERT INTO pipeline_jobs (run_id, type, status, priority, max_attempts, payload)
    VALUES (${run.id}, 'candle_refresh', 'pending', 200, 1, ${payload}::jsonb)
    ON CONFLICT DO NOTHING;
  `;

  console.log(JSON.stringify({ run_id: run.id, msg: 'enqueued' }));
}

main().catch(e => {
  console.error(e.message);
  process.exit(1);
});

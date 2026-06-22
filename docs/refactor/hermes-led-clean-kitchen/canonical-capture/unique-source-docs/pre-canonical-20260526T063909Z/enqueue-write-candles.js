const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');

function loadEnv(p) {
  const env = {};
  const lines = fs.readFileSync(p, 'utf8').split('\n');
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq > 0) env[t.substring(0, eq)] = t.substring(eq + 1).trim();
  }
  return env;
}

async function main() {
  const env = loadEnv(path.join(__dirname, '.env.local'));
  const sql = neon(env.DATABASE_URL || env.NEON_DATABASE_URL);

  const [run] = await sql`
    INSERT INTO pipeline_runs (run_key, type, status)
    VALUES ('phase3_candle_write_top3', 'candle-refresh', 'running')
    ON CONFLICT (run_key) DO UPDATE SET status = 'running'
    RETURNING id;
  `;

  const payload = JSON.stringify({
    symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'],
    max_requests_per_symbol: 10,
    gap_ms: 250,
    write: true
  });

  await sql`
    INSERT INTO pipeline_jobs (run_id, type, status, priority, max_attempts, payload)
    VALUES (${run.id}, 'candle_refresh', 'pending', 200, 1, ${payload}::jsonb)
    ON CONFLICT DO NOTHING;
  `;

  console.log(JSON.stringify({ run_id: run.id, enqueued: true, symbols: 'BTCUSDT,ETHUSDT,SOLUSDT', mode: 'write' }));
}
main().catch(console.error);

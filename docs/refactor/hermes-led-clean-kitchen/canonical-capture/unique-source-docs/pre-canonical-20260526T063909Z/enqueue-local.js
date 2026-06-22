const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');

function loadEnv(envPath) {
  const envVars = {};
  if (!fs.existsSync(envPath)) return envVars;
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq > 0) {
      envVars[trimmed.substring(0, eq)] = trimmed.substring(eq + 1).trim();
    }
  }
  return envVars;
}

async function main() {
  const env = loadEnv(path.join(__dirname, '.env.local'));
  const DATABASE_URL = [REDACTED] || env.NEON_DATABASE_URL;
  if (!DATABASE_URL) {
    console.error('No DATABASE_URL found');
    process.exit(1);
  }

  const sql = neon(DATABASE_URL);

  const [run] = await sql`
    INSERT INTO pipeline_runs (run_key, type, status)
    VALUES ('phase3_candle_dry_btcusdt', 'candle-refresh', 'running')
    ON CONFLICT (run_key) DO UPDATE SET status = 'running'
    RETURNING id;
  `;

  const payload = JSON.stringify({
    symbols: ['BTCUSDT'],
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

  console.log(JSON.stringify({ run_id: run.id, enqueued: true }));

  // Monitor
  let lastStatus = '';
  for (let i = 0; i < 24; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const [job] = await sql`SELECT status, metrics FROM pipeline_jobs WHERE run_id = ${run.id}`;
    if (!job) { console.log('Job not found'); break; }
    const status = job.status;
    const metrics = job.metrics || {};
    if (status !== lastStatus) {
      lastStatus = status;
      console.log(JSON.stringify({ sec: (i+1)*5, status, metrics }));
      if (status === 'succeeded' || status === 'failed') break;
    }
  }
}

main().catch(e => {
  console.error(e.message);
  process.exit(1);
});

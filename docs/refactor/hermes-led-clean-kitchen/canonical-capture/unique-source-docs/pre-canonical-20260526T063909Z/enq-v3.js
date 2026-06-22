const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');

function loadEnv(p) {
  const env = {};
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
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
    VALUES ('phase5_verifier_v3', 'ml-verifier', 'running')
    ON CONFLICT (run_key) DO UPDATE SET status = 'running'
    RETURNING id;
  `;

  const payload = JSON.stringify({ batch_size: 10, mode: 'audit-only' });
  await sql`
    INSERT INTO pipeline_jobs (run_id, type, status, priority, max_attempts, payload)
    VALUES (${run.id}, 'ml_verifier_batch', 'pending', 175, 1, ${payload}::jsonb)
    ON CONFLICT DO NOTHING;
  `;

  console.log(JSON.stringify({ run_id: run.id, status: 'enqueued' }));
}

main().catch(e => { console.error(e.message); process.exit(1); });

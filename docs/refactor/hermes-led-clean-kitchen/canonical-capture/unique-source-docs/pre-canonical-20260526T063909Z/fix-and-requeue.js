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

  // Step 1: Cancel stuck job 16
  await sql`
    UPDATE pipeline_jobs
    SET status = 'failed',
        error = 'Cancelled by Hermes agent: batch too large, re-enqueuing with smaller size',
        updated_at = NOW()
    WHERE id = 16 AND status = 'running';
  `;

  // Step 2: Update run
  await sql`
    UPDATE pipeline_runs
    SET status = 'failed', updated_at = NOW()
    WHERE id = 16;
  `;

  // Step 3: Enqueue smaller verifier batch (25 calls)
  const [run] = await sql`
    INSERT INTO pipeline_runs (run_key, type, status)
    VALUES ('phase5_ml_verifier_small', 'ml-verifier', 'running')
    ON CONFLICT (run_key) DO UPDATE SET status = 'running'
    RETURNING id;
  `;

  const payload = JSON.stringify({ batch_size: 25, mode: 'audit-only' });
  await sql`
    INSERT INTO pipeline_jobs (run_id, type, status, priority, max_attempts, payload)
    VALUES (${run.id}, 'ml_verifier_batch', 'pending', 180, 1, ${payload}::jsonb)
    ON CONFLICT DO NOTHING;
  `;

  console.log(JSON.stringify({ reset_job_16: true, new_run_id: run.id, batch_size: 25 }));
}
main().catch(console.error);

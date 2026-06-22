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

  // Step 1: Force-cancel job 20
  await sql`
    UPDATE pipeline_jobs
    SET status = 'failed',
        error = 'Container recreated to fix model env',
        updated_at = NOW()
    WHERE id = 20 AND status = 'running';
  `;

  await sql`
    UPDATE pipeline_runs
    SET status = 'failed',
        updated_at = NOW()
    WHERE id = 20;
  `;

  // Step 2: Enqueue clean verifier job with qwen2.5:1.5b
  const [run] = await sql`
    INSERT INTO pipeline_runs (run_key, type, status)
    VALUES ('phase5_verifier_qwen25', 'ml-verifier', 'running')
    ON CONFLICT (run_key) DO UPDATE SET status = 'running'
    RETURNING id;
  `;

  const payload = JSON.stringify({ batch_size: 10, mode: 'audit-only' });
  await sql`
    INSERT INTO pipeline_jobs (run_id, type, status, priority, max_attempts, payload)
    VALUES (${run.id}, 'ml_verifier_batch', 'pending', 175, 1, ${payload}::jsonb)
    ON CONFLICT DO NOTHING;
  `;

  console.log(JSON.stringify({
    cancelled_job: 20,
    new_run_id: run.id,
    model: 'qwen2.5:1.5b',
    note: 'Container has correct model. Job should pick up in next poll.'
  }));
}

main().catch(console.error);

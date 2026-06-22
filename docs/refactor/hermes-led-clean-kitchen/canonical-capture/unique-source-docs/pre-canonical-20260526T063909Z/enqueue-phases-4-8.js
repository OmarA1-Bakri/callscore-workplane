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

  const jobs = [
    {
      runKey: 'phase4_match_prices_batch',
      runType: 'match-prices',
      jobType: 'match_prices_batch',
      payload: { limit: 1000, batch_size: 200, start_after_id: 0 },
      priority: 190
    },
    {
      runKey: 'phase5_ml_verifier_audit',
      runType: 'ml-verifier',
      jobType: 'ml_verifier_batch',
      payload: { batch_size: 250, mode: 'audit-only' },
      priority: 180
    },
    {
      runKey: 'phase6_promote_ml_dry',
      runType: 'ml-promotion',
      jobType: 'promote_ml_verified',
      payload: { dry_run: true, mode: 'shadow-diff' },
      priority: 170
    },
    {
      runKey: 'phase8_compute_scores',
      runType: 'score-compute',
      jobType: 'compute_scores',
      payload: {},
      priority: 160
    }
  ];

  const results = [];
  for (const j of jobs) {
    const [run] = await sql`
      INSERT INTO pipeline_runs (run_key, type, status)
      VALUES (${j.runKey}, ${j.runType}, 'running')
      ON CONFLICT (run_key) DO UPDATE SET status = 'running'
      RETURNING id;
    `;

    const payload = JSON.stringify(j.payload);
    await sql`
      INSERT INTO pipeline_jobs (run_id, type, status, priority, max_attempts, payload)
      VALUES (${run.id}, ${j.jobType}, 'pending', ${j.priority}, 1, ${payload}::jsonb)
      ON CONFLICT DO NOTHING;
    `;

    results.push({ run_id: run.id, job_type: j.jobType, priority: j.priority });
  }

  console.log(JSON.stringify({ enqueued: results.length, jobs: results }));
}

main().catch(e => {
  console.error(e.message);
  process.exit(1);
});

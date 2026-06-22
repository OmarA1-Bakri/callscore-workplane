import { neon } from "@neondatabase/serverless";

async function main() {
  const sql = neon(process.env.NEON_DATABASE_URL!);

  const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'pipeline_jobs' ORDER BY ordinal_position`;
  console.log("pipeline_jobs columns:", cols.map((c: any) => c.column_name).join(", "));

  const jobs = await sql`SELECT id, type, status, created_at FROM pipeline_jobs ORDER BY created_at DESC LIMIT 10`;
  console.log("\nRecent jobs:");
  for (const j of jobs) {
    console.log(`  #${j.id} ${j.type} | ${j.status} | created ${j.created_at}`);
  }

  const events = await sql`SELECT job_id, event, message, created_at FROM pipeline_job_events ORDER BY created_at DESC LIMIT 10`;
  console.log("\nRecent events:");
  for (const e of events) {
    console.log(`  job#${e.job_id} ${e.event} | ${(e.message||"").slice(0,80)} | ${e.created_at}`);
  }
}

main().catch(console.error);

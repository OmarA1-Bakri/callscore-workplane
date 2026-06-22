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

  // 1. Overall stats
  const stats = await sql`
    SELECT 
      COUNT(DISTINCT v.id) as total_videos,
      COUNT(DISTINCT CASE WHEN v.transcript IS NOT NULL THEN v.id END) as videos_with_transcript,
      COUNT(DISTINCT c.video_id) as videos_with_calls,
      COUNT(DISTINCT c.id) as total_calls,
      ROUND(AVG(c.extraction_confidence)::numeric, 3) as avg_confidence
    FROM videos v
    LEFT JOIN calls c ON c.video_id = v.id;
  `;
  console.log('\n=== OVERALL STATS ===');
  console.log(JSON.stringify(stats[0], null, 2));

  // 2. Sample 10 videos with transcript and calls
  const sample = await sql`
    SELECT 
      v.id,
      v.youtube_video_id,
      v.title,
      cr.name as creator_name,
      COUNT(DISTINCT c.id) as num_calls_extracted,
      v.transcript IS NOT NULL as has_transcript,
      v.published_at,
      LENGTH(v.transcript) as transcript_length
    FROM videos v
    JOIN creators cr ON v.creator_id = cr.id
    LEFT JOIN calls c ON c.video_id = v.id
    WHERE v.transcript IS NOT NULL
    GROUP BY v.id, v.youtube_video_id, v.title, cr.name, v.published_at, v.transcript
    HAVING COUNT(c.id) > 0
    ORDER BY RANDOM()
    LIMIT 10;
  `;

  console.log('\n=== 10 RANDOM TRANSCRIPTS WITH CALLS ===');
  for (const row of sample) {
    console.log('\n---');
    console.log(`Video: ${row.title}`);
    console.log(`YouTube ID: ${row.youtube_video_id}`);
    console.log(`Creator: ${row.creator_name}`);
    console.log(`Published: ${row.published_at}`);
    console.log(`Transcript length: ${row.transcript_length} chars`);
    console.log(`Calls extracted: ${row.num_calls_extracted}`);

    // Get call details
    const calls = await sql`
      SELECT 
        symbol,
        direction,
        call_type,
        extraction_confidence,
        timeframe,
        strategy_type,
        entry_price,
        target_price,
        stop_loss,
        LEAST(LENGTH(raw_quote), 100) as quote_preview_len
      FROM calls
      WHERE video_id = ${row.id}
      ORDER BY created_at;
    `;

    calls.forEach((c, i) => {
      console.log(`  [${i + 1}] ${c.symbol} ${c.direction} (${c.call_type}, conf=${c.extraction_confidence}, horizon=${c.timeframe})`);
      console.log(`       strategy=${c.strategy_type} entry=${c.entry_price} target=${c.target_price} sl=${c.stop_loss}`);
    });
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });

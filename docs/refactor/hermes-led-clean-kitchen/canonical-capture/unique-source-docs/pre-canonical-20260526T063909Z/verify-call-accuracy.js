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

const CALL_KEYWORDS = [
  /\b(buy|buying)\b.{0,80}(bitcoin|btc|ethereum|eth|solana|sol|xrp|ripple|cardano|ada|chainlink|link|near|dot|polkadot|bnb|binance)/i,
  /\b(sell|selling)\b.{0,80}(bitcoin|btc|ethereum|eth|solana|sol|xrp|ripple|cardano|ada|chainlink|link|near|dot|polkadot|bnb|binance)/i,
  /\b(long|short)\b.{0,80}(bitcoin|btc|ethereum|eth|solana|sol|xrp|ripple|cardano|ada|chainlink|link|near|dot|polkadot|bnb|binance)/i,
  /\b(bullish|bearish)\b.{0,80}(bitcoin|btc|ethereum|eth|solana|sol|xrp|ripple|cardano|ada|chainlink|link|near|dot|polkadot|bnb|binance)/i,
  /\b(target|price target)\b.{0,30}\$?\d/i,
  /\b(stop loss)\b.{0,30}\$?\d/i,
  /\b(take profit)\b.{0,30}\$?\d/i,
  /\b(entry price|entry at)\b.{0,30}\$?\d/i,
  /\b(will reach|going to|expect to see)\b.{0,30}\$?\d{3,}/i,
  /\b(going up|going down|pump|dump)\b.{0,80}\b(bitcoin|btc|ethereum|eth|solana|sol|xrp|ada|link|dot|bnb)/i,
  /\b(bitcoin|btc|ethereum|eth|solana|sol|xrp|ripple|cardano|ada|chainlink|link|near|dot|polkadot|bnb)\b.{0,100}\b(buy|sell|long|short|target|entry|call|prediction)\b/i
];

function countKeywords(text) {
  const lines = text.split('\n').filter(l => l.trim().length > 10);
  const matches = [];
  for (const line of lines) {
    for (const re of CALL_KEYWORDS) {
      if (re.test(line)) {
        matches.push(line.substring(0, 120));
        break;
      }
    }
  }
  return { count: matches.length, samples: matches.slice(0, 6) };
}

async function main() {
  const env = loadEnv(path.join(__dirname, '.env.local'));
  const sql = neon(env.DATABASE_URL || env.NEON_DATABASE_URL);

  // Get same 10 videos
  const videos = await sql`
    SELECT 
      v.id,
      v.youtube_video_id,
      v.title,
      cr.name as creator_name,
      v.transcript,
      v.published_at
    FROM videos v
    JOIN creators cr ON v.creator_id = cr.id
    WHERE v.transcript IS NOT NULL
    ORDER BY RANDOM()
    LIMIT 10;
  `;

  console.log('=== TRANSCRIPT VS EXTRACTION AUDIT ===');
  console.log('Checking transcripts for explicit trading call language vs extracted call counts.\n');

  let totalKeywordHits = 0;
  let totalExtracted = 0;

  for (const v of videos) {
    const transcript = v.transcript || '';
    const lines = transcript.split('\n').length;
    const chars = transcript.length;
    
    const { count: keywordHits, samples } = countKeywords(transcript);
    totalKeywordHits += keywordHits;

    const calls = await sql`
      SELECT symbol, direction, extraction_confidence, target_price, entry_price, stop_loss, call_type
      FROM calls
      WHERE video_id = ${v.id}
      ORDER BY created_at;
    `;
    totalExtracted += calls.length;

    console.log(`\n---`);
    console.log(`VIDEO: "${v.title}"`);
    console.log(`CREATOR: ${v.creator_name} | ID: ${v.youtube_video_id}`);
    console.log(`TRANSCRIPT: ${chars} chars, ${lines} lines`);
    console.log(`KEYWORD HITS (likely call mentions): ${keywordHits}`);
    console.log(`EXTRACTED CALLS: ${calls.length}`);
    console.log(`MATCH RATE: ${calls.length > 0 ? Math.round((calls.length / keywordHits) * 100) : 0}%`);

    if (samples.length > 0) {
      console.log(`SAMPLE KEYWORD HITS:`);
      samples.forEach((s, i) => console.log(`  [${i+1}] ${s}`));
    }

    if (calls.length > 0) {
      console.log(`EXTRACTED:`);
      calls.forEach((c, i) => {
        const prices = [];
        if (c.entry_price) prices.push(`entry=$${c.entry_price}`);
        if (c.target_price) prices.push(`target=$${c.target_price}`);
        if (c.stop_loss) prices.push(`sl=$${c.stop_loss}`);
        console.log(`  [${i+1}] ${c.symbol} ${c.direction} (${c.call_type}, conf=${c.extraction_confidence}) ${prices.join(' ')}`);
      });
    }
  }

  console.log(`\n\n=== SUMMARY ===`);
  console.log(`Total keyword hits across 10: ${totalKeywordHits}`);
  console.log(`Total extracted calls: ${totalExtracted}`);
  console.log(`Overall match rate: ${totalKeywordHits > 0 ? Math.round((totalExtracted / totalKeywordHits) * 100) : 0}%`);
  console.log(`\nNote: Keywords are heuristic; not every keyword hit is a real trading call.`);
  console.log(`A match rate > 80% suggests extraction is working. < 50% suggests under-extraction.`);
  console.log(`> 120% suggests over-extraction (false positives).`);
}

main().catch(e => { console.error(e.message); process.exit(1); });

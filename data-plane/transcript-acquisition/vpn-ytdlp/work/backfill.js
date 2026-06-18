#!/usr/bin/env node
const { execFileSync } = require('child_process');
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');

// Args
const write = process.argv.includes('--write');
const limit = parseInt(process.argv[process.argv.indexOf('--limit')+1] || '50');
const offset = parseInt(process.argv[process.argv.indexOf('--offset')+1] || '0');
const gapMs = parseInt(process.argv[process.argv.indexOf('--gap-ms')+1] || '15000');
const dbUrl = process.env.DATABASE_URL || process.argv[process.argv.indexOf('--db-url')+1];
if (!dbUrl) { console.error('Need DATABASE_URL'); process.exit(1); }

const sql = neon(dbUrl);
const ts = () => new Date().toISOString();

function log(o) { console.log(JSON.stringify(o)); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

function ytDlp(args, timeout=120000) {
  try {
    const out = execFileSync('/usr/local/bin/yt-dlp', args, {
      encoding:'utf8', timeout, maxBuffer:50*1024*1024,
      stdio:['ignore','pipe','pipe']
    });
    return JSON.parse(out);
  } catch(e) {
    const msg = [e.stderr,e.stdout,e.message].filter(Boolean).join(' ').replace(/\s+/g,' ').trim();
    throw new Error(msg);
  }
}

function stripSrt(text) {
  return String(text||'')
    .replace(/^\d+$/gm,'').replace(/^\d\d:\d\d:\d\d[.,]\d+\s+-->.*$/gm,'')
    .replace(/<[^>]+>/g,'').split('\n').map(l=>l.trim()).filter(Boolean)
    .filter((l,i,a)=>i===0||l!==a[i-1]).join('\n').trim();
}

async function fetchOne(videoId) {
  let details;
  try {
    details = ytDlp([
      '--dump-single-json','--skip-download','--write-auto-subs','--sub-langs','en.*,en',
      '--sleep-requests','15','--sleep-interval','10',
      `https://www.youtube.com/watch?v=${videoId}`
    ]);
  } catch(e) { return {ok:false,reason:String(e.message).slice(0,200)}; }

  const caps = {...(details.subtitles||{}), ...(details.automatic_captions||{})};
  const langs = ['en','en-US','en-GB','en-CA'];
  let url = null, isAuto = false;
  for (const lang of langs) {
    for (const [manualAuto, autoFlag] of [[details.subtitles,false],[details.automatic_captions,true]]) {
      const fmts = (manualAuto||{})[lang];
      if (fmts?.length) {
        const f = fmts.find(x=>x.ext==='vtt')||fmts.find(x=>x.ext==='srt')||fmts[0];
        if (f?.url) { url = f.url; isAuto = autoFlag; break; }
      }
    }
    if (url) break;
  }
  if (!url) return {ok:false,reason:'no-captions'};

  try {
    const res = await fetch(url);
    if (!res.ok) return {ok:false,reason:`HTTP ${res.status}`};
    const text = stripSrt(await res.text());
    if (text.length < 200) return {ok:false,reason:'too-short'};
    return {ok:true, text, auto:isAuto, title:details.title};
  } catch(e) { return {ok:false,reason:String(e.message).slice(0,200)}; }
}

async function main() {
  const videos = await sql`SELECT v.id, v.youtube_video_id, v.title, c.name AS creator_name
    FROM videos v JOIN creators c ON c.id = v.creator_id
    WHERE v.published_at IS NOT NULL AND (v.transcript IS NULL OR length(v.transcript)=0)
    ORDER BY v.published_at DESC LIMIT ${limit} OFFSET ${offset}`;

  log({event:'start',write,limit,offset,videos:videos.length,dbUrl_ok:!!dbUrl});

  let saved=0, failed=0, blocked=0;
  for (const v of videos) {
    const r = await fetchOne(v.youtube_video_id);
    if (!r.ok) {
      failed++;
      if (/429|block|bot/i.test(r.reason)) { blocked++; if (blocked>=2) { log({event:'stop_blocked',blocked}); break; } }
      log({event:'fail',video_id:v.id,youtube_video_id:v.youtube_video_id,reason:r.reason});
    } else {
      if (write) {
        await sql`UPDATE videos SET transcript=${r.text}, transcript_quality=0.8, calls_extracted=false WHERE id=${v.id}`;
      }
      saved++;
      log({event:write?'saved':'would_save',video_id:v.id,youtube_video_id:v.youtube_video_id,chars:r.text.length,auto:r.auto});
    }
    await sleep(gapMs);
  }
  log({event:'done',saved,failed,blocked,write});
}
main().catch(e=>{console.error(e);process.exit(1);});

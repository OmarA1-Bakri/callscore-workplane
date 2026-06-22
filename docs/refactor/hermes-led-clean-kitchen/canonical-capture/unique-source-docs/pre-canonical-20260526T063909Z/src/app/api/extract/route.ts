import { NextRequest, NextResponse } from "next/server";
import {
  enqueueCandleRefreshJob,
  enqueueComputeScoresJob,
  enqueueMatchPricesBatchJob,
  enqueueNightlyMlVerifierJob,
  enqueuePipelineJob,
  getPipelineStatusSnapshot,
} from "@/lib/pipeline";
import { createLogger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const logger = createLogger("extract-api");

interface ExtractRequest {
  readonly ids?: readonly string[];
  readonly sinceDays?: number;
  readonly dryRun?: boolean;
  readonly stages?: readonly string[];
}

interface ExtractResponse {
  readonly ok: boolean;
  readonly jobs: readonly string[];
  readonly message: string;
  readonly pipelineStatus?: unknown;
}

function positiveInt(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

async function getBody(request: NextRequest): Promise<ExtractRequest> {
  const contentType = request.headers.get("content-type") ?? "";
  if (request.method !== "POST" || !contentType.includes("application/json")) {
    return {};
  }
  try {
    return (await request.json()) as ExtractRequest;
  } catch {
    return {};
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await getBody(request);
  const sinceDays = positiveInt(body.sinceDays, 365);
  const dryRun = Boolean(body.dryRun);
  const stages = body.stages ?? [];

  const jobs: string[] = [];

  try {
    // 1. Discover + Transcript extraction (enqueued as pipeline job)
    await enqueuePipelineJob({
      type: "discover_transcripts_extract",
      payload: {
        ids: body.ids,
        since_days: sinceDays,
        dry_run: dryRun,
      },
      priority: 10,
      max_attempts: 3,
    });
    jobs.push("discover_transcripts_extract");
    logger.info("enqueued_discover_transcripts_extract", {
      ids: body.ids,
      sinceDays,
      dryRun,
    });

    // 2. Candle refresh
    if (stages.length === 0 || stages.includes("candles")) {
      const candleJob = await enqueueCandleRefreshJob({ dryRun });
      jobs.push(`candle_refresh:${candleJob.job_id}`);
      logger.info("enqueued_candle_refresh", { job_id: candleJob.job_id, dryRun });
    }

    // 3. Match prices
    if (stages.length === 0 || stages.includes("match_prices")) {
      const matchJob = await enqueueMatchPricesBatchJob({ dryRun });
      jobs.push(`match_prices:${matchJob.job_id}`);
      logger.info("enqueued_match_prices", { job_id: matchJob.job_id, dryRun });
    }

    // 4. ML verifier / promotion
    if (stages.length === 0 || stages.includes("ml_verifier")) {
      const mlJob = await enqueueNightlyMlVerifierJob({ dryRun });
      jobs.push(`ml_verifier:${mlJob.job_id}`);
      logger.info("enqueued_ml_verifier", { job_id: mlJob.job_id, dryRun });
    }

    // 5. Compute scores
    if (stages.length === 0 || stages.includes("compute_scores")) {
      const scoreJob = await enqueueComputeScoresJob({ dryRun });
      jobs.push(`compute_scores:${scoreJob.job_id}`);
      logger.info("enqueued_compute_scores", { job_id: scoreJob.job_id, dryRun });
    }

    const pipelineStatus = await getPipelineStatusSnapshot(5);

    const response: ExtractResponse = {
      ok: true,
      jobs,
      message: `Enqueued ${jobs.length} pipeline jobs.`,
      pipelineStatus,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    logger.error("extract_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        ok: false,
        jobs,
        message: error instanceof Error ? error.message : "Unknown error",
      } as ExtractResponse,
      { status: 500 },
    );
  }
}

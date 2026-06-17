import { createHash } from "node:crypto";
import {
  BlockedActionError,
  ConsentRequiredError,
  PayloadChangedError,
  executeWithDispatchAudit,
  type DispatchAuditInput,
} from "./executor.js";
import type { LogEvent, PlannerOutput, StatePhase1 } from "./schemas.js";
import { payloadHash, sanitizeRemoteStateForPlanner } from "./tools/events.js";

type PlannedAction = PlannerOutput["actions"][number];
type DivergenceEvent = Extract<LogEvent, { type: "divergence" }>;
type ConsentSource = Exclude<DispatchAuditInput["consentSource"], undefined>;
type PriorConsent = NonNullable<DispatchAuditInput["priorConsent"]>;

export type SkillAction = PlannedAction & {
  payload: unknown;
  targetIds?: Record<string, string>;
  targetNames?: Record<string, string>;
};

export type StepObservation =
  | {
      ok: true;
      proof: unknown;
      returnedId?: string;
    }
  | {
      ok: false;
      proof?: unknown;
      reason?: string;
      divergenceClass?: DivergenceEvent["divergenceClass"];
      terminalState?: StatePhase1;
    };

export interface RunSkillOptions {
  skill: string;
  runId: string;
  targetRepo: string;
  actions: SkillAction[];
  prepareAction?: (action: SkillAction) => Promise<SkillAction> | SkillAction;
  appendEvent: (runId: string, event: LogEvent) => Promise<void>;
  dispatchStep: (action: SkillAction) => Promise<unknown>;
  observeStep: (action: SkillAction, dispatchResult: unknown) => Promise<StepObservation | null>;
  computeTerminalState: () => Promise<StatePhase1> | StatePhase1;
  successTerminalState: StatePhase1;
  priorConsents?: Record<string, PriorConsent>;
  consentSources?: Record<string, ConsentSource>;
  now?: () => string;
}

export interface RunSkillResult {
  status: "finalized" | "blocked" | "consent-required" | "payload-changed" | "diverged" | "unknown-terminal";
  terminalState: StatePhase1;
  stepId?: string;
}

export async function runSkill(opts: RunSkillOptions): Promise<RunSkillResult> {
  const now = opts.now ?? (() => new Date().toISOString());

  await opts.appendEvent(opts.runId, {
    type: "intent",
    runId: opts.runId,
    skill: opts.skill,
    plannedActions: opts.actions.map(toPlannedAction),
    at: now(),
  });

  for (const action of opts.actions) {
    let preparedAction = action;
    let dispatchedRecorded = false;
    let observation: StepObservation | null;

    try {
      preparedAction = opts.prepareAction ? await opts.prepareAction(action) : action;
      const { result } = await executeWithDispatchAudit({
        runId: opts.runId,
        skill: opts.skill,
        targetRepo: opts.targetRepo,
        action: toPlannedAction(preparedAction),
        payload: preparedAction.payload,
        targetIds: preparedAction.targetIds,
        targetNames: preparedAction.targetNames,
        priorConsent: opts.priorConsents?.[action.stepId],
        consentSource: opts.consentSources?.[action.stepId],
        at: now(),
        appendEvent: async (runId, event) => {
          await opts.appendEvent(runId, event);
          if (event.type === "dispatched") {
            dispatchedRecorded = true;
          }
        },
        dispatch: async () => opts.dispatchStep(preparedAction),
      });

      observation = await opts.observeStep(preparedAction, result);
    } catch (error: unknown) {
      if (error instanceof BlockedActionError) {
        return { status: "blocked", terminalState: "blocked-by-policy", stepId: action.stepId };
      }
      if (error instanceof ConsentRequiredError) {
        return { status: "consent-required", terminalState: "consent-required", stepId: action.stepId };
      }
      if (error instanceof PayloadChangedError) {
        return { status: "payload-changed", terminalState: "payload-changed", stepId: action.stepId };
      }

      if (dispatchedRecorded) {
        await opts.appendEvent(
          opts.runId,
          createDivergenceEvent({
            skill: opts.skill,
            runId: opts.runId,
            action: preparedAction,
            proof: { status: "dispatch-or-observe-error" },
            reason: error instanceof Error ? error.message : String(error),
            divergenceClass: "unknown-remote-state",
            terminalState: "unknown-remote-state",
            at: now(),
          }),
        );

        return {
          status: "diverged",
          terminalState: "unknown-remote-state",
          stepId: action.stepId,
        };
      }

      throw error;
    }

    if (observation === null || observation.ok === false) {
      const terminalState = observation?.terminalState ?? "unknown-remote-state";
      const divergenceClass = observation?.divergenceClass ?? "unknown-remote-state";
      const proof = observation?.proof ?? { status: "missing-proof" };
      const reason = observation?.reason ?? "missing-proof";

      await opts.appendEvent(
        opts.runId,
        createDivergenceEvent({
          skill: opts.skill,
          runId: opts.runId,
          action: preparedAction,
          proof,
          reason,
          divergenceClass,
          terminalState,
          at: now(),
        }),
      );

      return {
        status: "diverged",
        terminalState,
        stepId: action.stepId,
      };
    }

    try {
      await opts.appendEvent(opts.runId, createObservedEvent({
        runId: opts.runId,
        skill: opts.skill,
        action: preparedAction,
        proof: observation.proof,
        returnedId: observation.returnedId,
        at: now(),
      }));
    } catch (error: unknown) {
      try {
        await opts.appendEvent(
          opts.runId,
          createDivergenceEvent({
            skill: opts.skill,
            runId: opts.runId,
            action: preparedAction,
            proof: {
              status: "observed-append-failed",
              observation: observation.proof,
            },
            reason: error instanceof Error ? error.message : String(error),
            divergenceClass: "unknown-remote-state",
            terminalState: "unknown-remote-state",
            at: now(),
          }),
        );
      } catch {
        throw error;
      }

      return {
        status: "diverged",
        terminalState: "unknown-remote-state",
        stepId: action.stepId,
      };
    }
  }

  const terminalState = await opts.computeTerminalState();
  if (terminalState !== opts.successTerminalState) {
    return { status: "unknown-terminal", terminalState };
  }

  await opts.appendEvent(opts.runId, {
    type: "finalized",
    runId: opts.runId,
    terminalState,
    at: now(),
  });

  return { status: "finalized", terminalState };
}

function toPlannedAction(action: SkillAction): PlannedAction {
  return {
    stepId: action.stepId,
    capabilityId: action.capabilityId,
    toolId: action.toolId,
    riskClass: action.riskClass,
    idempotencyKey: action.idempotencyKey,
    requires_consent: action.requires_consent,
    consent_reason: action.consent_reason,
  };
}

function createObservedEvent(opts: {
  runId: string;
  skill: string;
  action: SkillAction;
  proof: unknown;
  returnedId?: string;
  at: string;
}): Extract<LogEvent, { type: "observed" }> {
  return {
    type: "observed",
    runId: opts.runId,
    skill: opts.skill,
    stepId: opts.action.stepId,
    capabilityId: opts.action.capabilityId,
    toolId: opts.action.toolId,
    riskClass: opts.action.riskClass,
    payloadHash: payloadHash(opts.action.payload),
    responseDigest: payloadHash(sanitizeRemoteStateForPlanner(opts.proof)),
    returnedId: opts.returnedId,
    at: opts.at,
  };
}

function createDivergenceEvent(opts: {
  skill: string;
  runId: string;
  action: SkillAction;
  proof: unknown;
  reason: string;
  divergenceClass: DivergenceEvent["divergenceClass"];
  terminalState: StatePhase1;
  at: string;
}): DivergenceEvent {
  const sanitizedProof = sanitizeRemoteStateForPlanner(opts.proof);
  return {
    type: "divergence",
    runId: opts.runId,
    skill: opts.skill,
    stepId: opts.action.stepId,
    capabilityId: opts.action.capabilityId,
    toolId: opts.action.toolId,
    expectedPayloadHash: payloadHash(opts.action.payload),
    observedPayloadHash: payloadHash(sanitizedProof),
    observedDigestHash: payloadHash({
      proof: sanitizedProof,
      divergenceClass: opts.divergenceClass,
      terminalState: opts.terminalState,
    }),
    divergenceClass: opts.divergenceClass,
    redactedReason: redactedReason(opts.reason),
    terminalState: opts.terminalState,
    at: opts.at,
  };
}

function redactedReason(reason: string): string {
  return `sha256:${createHash("sha256").update(reason).digest("hex")}`;
}

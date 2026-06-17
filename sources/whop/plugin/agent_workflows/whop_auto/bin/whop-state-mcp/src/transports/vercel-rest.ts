export interface VercelProject {
  id: string;
  name: string;
  link?: { type: "github"; repo: string; repoId?: number } | null;
  [k: string]: unknown;
}
export interface VercelDeployment {
  uid: string;
  state: "QUEUED" | "BUILDING" | "READY" | "ERROR" | "CANCELED";
  target?: string | null;
  readySubstate?: string | null;
  meta?: { githubCommitSha?: string };
  [k: string]: unknown;
}

export interface VercelDeploymentAlias {
  uid?: string;
  alias: string;
  [k: string]: unknown;
}

export interface VercelPromotionVerification {
  deployment: VercelDeployment;
  verifiedProductionAlias?: string;
}

export interface VercelRestOptions {
  token: string;
  teamId?: string;
  baseUrl?: string;
  fetchFn?: typeof fetch;
  retryDelaysMs?: number[];
  waitIntervalMs?: number;
  waitMaxMs?: number;
}

export function createVercelRest(opts: VercelRestOptions) {
  const baseUrl = opts.baseUrl ?? "https://api.vercel.com";
  const fetchFn = opts.fetchFn ?? fetch;
  const retryDelays = opts.retryDelaysMs ?? [1000, 4000, 16000];
  const waitIntervalMs = opts.waitIntervalMs ?? 5_000;
  const waitMaxMs = opts.waitMaxMs ?? 15 * 60_000;

  function url(path: string, query?: Record<string, string | undefined>): string {
    const qs = new URLSearchParams();
    if (opts.teamId) qs.set("teamId", opts.teamId);
    if (query) for (const [k, v] of Object.entries(query)) if (v !== undefined) qs.set(k, v);
    return `${baseUrl}${path}${qs.toString() ? `?${qs}` : ""}`;
  }

  async function request<T>(method: string, path: string, body?: unknown, query?: Record<string, string | undefined>): Promise<T | { __notFound: true }> {
    const init: RequestInit = {
      method,
      headers: { Authorization: `Bearer ${opts.token}`, "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    };
    let lastStatus = 0, lastBody = "";
    for (let attempt = 0; attempt <= retryDelays.length; attempt++) {
      const res = await fetchFn(url(path, query), init);
      if (res.ok) return (await res.json()) as T;
      lastStatus = res.status;
      lastBody = await res.text().catch(() => "");
      if (res.status === 404) return { __notFound: true };
      if (res.status < 500) break;
      if (attempt < retryDelays.length) await new Promise((r) => setTimeout(r, retryDelays[attempt]));
    }
    throw new Error(`Vercel REST ${method} ${path} failed: ${lastStatus} ${lastBody}`);
  }

  return {
    async getProject(nameOrId: string): Promise<VercelProject | null> {
      const r = await request<VercelProject>("GET", `/v9/projects/${encodeURIComponent(nameOrId)}`);
      return "__notFound" in r ? null : r;
    },
    async createProject(input: { name: string; gitRepository?: { type: "github"; repo: string } }): Promise<VercelProject> {
      const r = await request<VercelProject>("POST", `/v9/projects`, input);
      if ("__notFound" in r) throw new Error("unexpected 404 on create");
      return r;
    },
    async unlinkGitRepo(projectId: string): Promise<void> {
      await request<unknown>("DELETE", `/v9/projects/${encodeURIComponent(projectId)}/link`);
    },
    async linkGitRepo(params: { projectId: string; repo: string; teamId?: string }): Promise<unknown> {
      const query = params.teamId ? { teamId: params.teamId } : undefined;
      const r = await request<unknown>(
        "POST",
        `/v9/projects/${encodeURIComponent(params.projectId)}/link`,
        { type: "github", repo: params.repo },
        query,
      );
      if (r && typeof r === "object" && "__notFound" in r) throw new Error(`linkGitRepo: project ${params.projectId} not found`);
      return r;
    },
    async upsertEnv(projectId: string, vars: Array<{ key: string; value: string; target: Array<"production" | "preview" | "development"> }>): Promise<void> {
      for (const envVar of vars) {
        const isPublic = envVar.key.startsWith("NEXT_PUBLIC_");
        const target = isPublic ? envVar.target : envVar.target.filter((entry) => entry !== "development");
        await request<unknown>(
          "POST",
          `/v10/projects/${encodeURIComponent(projectId)}/env`,
          { ...envVar, target, type: isPublic ? "plain" : "sensitive" },
          { upsert: "true" },
        );
      }
    },
    async listDeployments(params: { projectId: string; sha?: string; target?: string }): Promise<VercelDeployment[]> {
      const r = await request<{ deployments: VercelDeployment[] }>(
        "GET",
        `/v6/deployments`,
        undefined,
        { projectId: params.projectId, ...(params.target ? { target: params.target } : {}) },
      );
      if ("__notFound" in r) return [];
      const all = r.deployments ?? [];
      return params.sha ? all.filter((d) => d.meta?.githubCommitSha === params.sha) : all;
    },
    async waitForDeployment(params: { projectId: string; sha: string }): Promise<VercelDeployment> {
      const deadline = Date.now() + waitMaxMs;
      while (Date.now() < deadline) {
        const deployments = await this.listDeployments(params);
        const found = deployments[0];
        if (found?.state === "READY") return found;
        if (found?.state === "ERROR" || found?.state === "CANCELED") throw new Error(`Deployment ${found.uid} ${found.state}`);
        await new Promise((r) => setTimeout(r, waitIntervalMs));
      }
      throw new Error(`waitForDeployment timeout after ${waitMaxMs}ms for sha ${params.sha}`);
    },
    async promoteToProd(params: { projectId: string; deploymentId: string }): Promise<void> {
      const r = await request<Record<string, unknown>>("POST", `/v10/projects/${encodeURIComponent(params.projectId)}/promote/${encodeURIComponent(params.deploymentId)}`);
      if ("__notFound" in r) throw new Error("promote target not found");
    },
    async listDeploymentAliases(deploymentId: string): Promise<VercelDeploymentAlias[]> {
      const r = await request<{ aliases?: VercelDeploymentAlias[] }>(
        "GET",
        `/v2/deployments/${encodeURIComponent(deploymentId)}/aliases`,
      );
      if ("__notFound" in r) return [];
      return r.aliases ?? [];
    },
    async verifyPromotion(params: {
      projectId: string;
      deploymentId: string;
      sha: string;
      productionDomain?: string;
    }): Promise<VercelPromotionVerification | null> {
      if (params.productionDomain) {
        const deployments = await this.listDeployments({ projectId: params.projectId, sha: params.sha });
        const deployment = deployments.find((candidate) => candidate.uid === params.deploymentId) ?? null;
        if (!deployment) {
          return null;
        }
        const aliases = await this.listDeploymentAliases(params.deploymentId);
        const expectedDomain = normalizeAliasDomain(params.productionDomain);
        if (!expectedDomain) {
          return null;
        }
        const matchedAlias = aliases.find((candidate) => normalizeAliasDomain(candidate.alias) === expectedDomain);
        if (!matchedAlias) {
          return null;
        }
        return {
          deployment,
          verifiedProductionAlias: matchedAlias.alias,
        };
      }

      const deployments = await this.listDeployments({
        projectId: params.projectId,
        sha: params.sha,
        target: "production",
      });
      const deployment = deployments.find((candidate) => candidate.uid === params.deploymentId) ?? null;
      if (!deployment || deployment.target !== "production") {
        return null;
      }
      return { deployment };
    },
  };
}

function normalizeAliasDomain(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  try {
    const parsed = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    return parsed.host.toLowerCase();
  } catch {
    return trimmed
      .replace(/^https?:\/\//i, "")
      .replace(/[/?#].*$/, "")
      .replace(/\.$/, "")
      .toLowerCase();
  }
}

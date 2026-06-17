import { spawn } from "node:child_process";

function run(cmd: string, args: string[], cwd: string): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd });
    let stdout = "", stderr = "";
    p.stdout.on("data", (d) => (stdout += d.toString()));
    p.stderr.on("data", (d) => (stderr += d.toString()));
    p.on("error", reject);
    p.on("close", (code) => resolve({ stdout, stderr, code: code ?? 0 }));
  });
}

export async function gitStatus(repoDir: string): Promise<{ clean: boolean; head: string; remote: string | null }> {
  const { stdout: status } = await run("git", ["status", "--porcelain"], repoDir);
  const { stdout: head } = await run("git", ["rev-parse", "HEAD"], repoDir);
  const { stdout: remote, code: remoteCode } = await run("git", ["config", "--get", "remote.origin.url"], repoDir);
  return {
    clean: status.trim().length === 0,
    head: head.trim(),
    remote: remoteCode === 0 ? remote.trim() : null,
  };
}

export async function gitCurrentBranch(repoDir: string): Promise<string> {
  const { stdout, code, stderr } = await run("git", ["rev-parse", "--abbrev-ref", "HEAD"], repoDir);
  if (code !== 0) throw new Error(`git branch failed: ${stderr}`);
  return stdout.trim();
}

export async function gitPush(repoDir: string, remote: string, branch: string): Promise<{ success: boolean; stderr: string }> {
  const { code, stderr } = await run("git", ["push", remote, branch], repoDir);
  return { success: code === 0, stderr };
}

export async function gitAddCommit(repoDir: string, files: string[], message: string): Promise<void> {
  await run("git", ["add", ...files], repoDir);
  const { code, stderr } = await run("git", ["commit", "-m", message], repoDir);
  if (code !== 0 && !stderr.includes("nothing to commit")) throw new Error(`git commit failed: ${stderr}`);
}

export async function gitResetMixedHeadMinus1(repoDir: string): Promise<void> {
  const { code, stderr } = await run("git", ["reset", "--mixed", "HEAD^"], repoDir);
  if (code !== 0) throw new Error(`git reset failed: ${stderr}`);
}

export async function gitRestoreWorktree(repoDir: string, path: string): Promise<void> {
  const { code, stderr } = await run("git", ["restore", "--worktree", path], repoDir);
  if (code !== 0) throw new Error(`git restore failed: ${stderr}`);
}

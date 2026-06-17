export class KeychainError extends Error { constructor(m: string) { super(m); this.name = "KeychainError"; } }
export class SecretTooLargeError extends KeychainError {
  constructor(size: number) { super(`Secret size ${size} exceeds 2560-byte limit (N17)`); this.name = "SecretTooLargeError"; }
}
export class ReservedSuffixError extends KeychainError {
  constructor(path: string) { super(`Keychain path ${path} uses Phase 2 reserved suffix (N18); rejected in Phase 1`); this.name = "ReservedSuffixError"; }
}

export interface KeychainBackend {
  get(path: string): Promise<string | null>;
  set(path: string, value: string): Promise<void>;
  delete(path: string): Promise<void>;
}

const MAX_BYTES = 2560;
const RESERVED_SUFFIXES = ["-new", "-prior"];

function assertNotReserved(path: string): void {
  for (const s of RESERVED_SUFFIXES) {
    if (path.endsWith(s)) throw new ReservedSuffixError(path);
  }
}

function assertSizeOk(value: string): void {
  const bytes = Buffer.byteLength(value, "utf8");
  if (bytes > MAX_BYTES) throw new SecretTooLargeError(bytes);
}

export function createKeychain(opts: { backend: KeychainBackend }) {
  const { backend } = opts;
  return {
    async get(path: string): Promise<string | null> {
      return backend.get(path);
    },
    async set(path: string, value: string): Promise<void> {
      assertNotReserved(path);
      assertSizeOk(value);
      await backend.set(path, value);
    },
    async delete(path: string): Promise<void> {
      assertNotReserved(path);
      await backend.delete(path);
    },
    async canary(): Promise<boolean> {
      const probePath = "whop-pipeline/__canary__";
      const probeValue = "ok-" + Date.now();
      try {
        await backend.set(probePath, probeValue);
        const read = await backend.get(probePath);
        await backend.delete(probePath);
        return read === probeValue;
      } catch {
        return false;
      }
    },
  };
}

// Default backend using @napi-rs/keyring. Separate file to keep tests hermetic.
export async function createDefaultBackend(): Promise<KeychainBackend> {
  const { Entry } = await import("@napi-rs/keyring");
  return {
    async get(path: string) {
      try { return new Entry("whop-pipeline", path).getPassword(); }
      catch { return null; }
    },
    async set(path: string, value: string) {
      try {
        new Entry("whop-pipeline", path).setPassword(value);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new KeychainError(`keychain set failed for "${path}": ${msg}`);
      }
    },
    async delete(path: string) {
      try { new Entry("whop-pipeline", path).deletePassword(); }
      catch { /* already absent */ }
    },
  };
}

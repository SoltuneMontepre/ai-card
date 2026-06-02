let nextStartIndex = 0;

function maskKey(key: string): string {
  return `…${key.slice(-6)}`;
}

function formatError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

const KEY_PATTERN = /^GEMINI_API_KEY_(\d+)$/;

/** Loads all configured Gemini keys (GEMINI_API_KEY_1, _2, …), deduplicated. */
export function getApiKeys(): string[] {
  const entries: { index: number; value: string }[] = [];

  for (const [name, value] of Object.entries(process.env)) {
    const match = name.match(KEY_PATTERN);
    if (match && value?.trim()) {
      entries.push({ index: Number(match[1]), value: value.trim() });
    }
  }

  entries.sort((a, b) => a.index - b.index);
  return [...new Set(entries.map((e) => e.value))];
}

/** Returns keys in round-robin order for the current request. */
export function getRotatedKeyOrder(): string[] {
  const keys = getApiKeys();
  if (keys.length === 0) return [];

  const start = nextStartIndex % keys.length;
  nextStartIndex = (nextStartIndex + 1) % keys.length;

  return [...keys.slice(start), ...keys.slice(0, start)];
}

/**
 * Tries each API key exactly once (round-robin start order).
 * On any error, falls through to the next key. Throws the last error if all fail.
 */
export async function withGeminiKeyPool<T>(
  fn: (apiKey: string) => Promise<T>,
): Promise<T> {
  const keys = getRotatedKeyOrder();
  if (keys.length === 0) {
    throw new Error(
      "No Gemini API keys configured (GEMINI_API_KEY_1, GEMINI_API_KEY_2, …)",
    );
  }

  let lastError: unknown;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]!;
    try {
      return await fn(key);
    } catch (err) {
      lastError = err;
      console.warn(
        `[gemini-keys] key ${maskKey(key)} failed (${i + 1}/${keys.length}): ${formatError(err)}`,
      );
    }
  }

  throw lastError ?? new Error("All Gemini API keys failed");
}

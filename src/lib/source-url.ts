const URL_REGEX = /https?:\/\/[^\s<>"')\]]+/gi;

export function extractUrlsFromText(text: string): string[] {
  const matches = text.match(URL_REGEX) ?? [];
  return [...new Set(matches.map((u) => u.replace(/[.,;:!?)]+$/, "")))];
}

export type UrlReachability = "reachable" | "unreachable";

async function probeUrl(url: string): Promise<UrlReachability> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    for (const method of ["HEAD", "GET"] as const) {
      try {
        const res = await fetch(url, {
          method,
          signal: controller.signal,
          redirect: "follow",
          headers: { "User-Agent": "AI-Verification-Card/1.0" },
        });
        if (res.ok || res.status < 500) {
          return "reachable";
        }
      } catch {
        // try next method
      }
    }
    return "unreachable";
  } finally {
    clearTimeout(timeout);
  }
}

/** Checks whether URLs found in the text respond to HTTP requests. */
export async function checkUrlsInText(
  urls: string[],
): Promise<Map<string, UrlReachability>> {
  const results = new Map<string, UrlReachability>();
  await Promise.all(
    urls.map(async (url) => {
      results.set(url, await probeUrl(url));
    }),
  );
  return results;
}

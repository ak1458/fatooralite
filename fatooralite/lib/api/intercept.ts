/**
 * One-time `window.fetch` wrapper that notices the two API responses the
 * client has no other way of hearing about: an expired session (401) and a
 * plan refusal (402).
 *
 * There are ~63 `fetch("/api/...")` call sites across ~30 files, and most end
 * in `.catch(() => {})`, so a 401 currently surfaces as a silent JSON parse
 * failure and a 402 as nothing at all. Wrapping fetch once covers every call
 * site, including ones written later — a shared `apiFetch()` helper would have
 * required editing all of them and could still be forgotten by the next
 * person. The trade is a global patch, which is why this is deliberately
 * narrow: it reads status codes, never alters the response, and hands the
 * original object back untouched.
 */

export interface ApiRefusal {
  status: 401 | 402;
  /** Server-supplied message, when the body carried one. */
  message?: string;
  /** 402 only — from lib/billing/deny.ts. */
  upgradeUrl?: string;
  feature?: string;
}

type Listener = (refusal: ApiRefusal) => void;

let installed = false;

function isApiPath(input: RequestInfo | URL): boolean {
  const url =
    typeof input === "string" ? input : input instanceof URL ? input.pathname : (input as Request).url ?? "";
  try {
    const path = url.startsWith("http") ? new URL(url).pathname : url;
    // Auth endpoints answer 401 for ordinary wrong-password attempts; treating
    // those as an expired session would bounce the user off the login page
    // they are already on.
    return path.startsWith("/api/") && !path.startsWith("/api/auth/");
  } catch {
    return false;
  }
}

async function readRefusal(res: Response): Promise<ApiRefusal> {
  const status = res.status as 401 | 402;
  try {
    // clone() so the caller still receives an unconsumed body — the assistant
    // streams its response and would break if this drained it.
    const body = (await res.clone().json()) as Record<string, unknown>;
    return {
      status,
      message: typeof body.error === "string" ? body.error : undefined,
      upgradeUrl: typeof body.upgradeUrl === "string" ? body.upgradeUrl : undefined,
      feature: typeof body.feature === "string" ? body.feature : undefined,
    };
  } catch {
    return { status };
  }
}

/**
 * Installs the wrapper. Safe to call more than once — only the first call
 * patches. Returns a function that restores the original fetch.
 */
export function installApiInterceptor(onRefusal: Listener): () => void {
  if (typeof window === "undefined") return () => {};
  if (installed) return () => {};
  installed = true;

  const original = window.fetch;

  window.fetch = async function patchedFetch(input, init) {
    const res = await original(input, init);
    if ((res.status === 401 || res.status === 402) && isApiPath(input)) {
      // Fire and forget: reading the clone must never delay or fail the
      // response the caller is waiting on.
      void readRefusal(res).then(onRefusal).catch(() => {});
    }
    return res;
  };

  return () => {
    window.fetch = original;
    installed = false;
  };
}

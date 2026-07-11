import { useCallback, useEffect, useState } from "react";

/* Never hang on "Loading…" again.
   A page that fetches must be able to fail out loud: expired session -> sign in,
   anything else -> a retry. Used via useLoad() + <LoadGate/>. */

export type LoadErr = "" | "auth" | "fail";

export function classifyErr(e: unknown): LoadErr {
  const msg = e instanceof Error ? e.message : String(e ?? "");
  return /401|403|unauth|forbidden|not authenticated/i.test(msg) ? "auth" : "fail";
}

/** Run a fetch with honest error state and a retry. */
export function useLoad<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [err, setErr] = useState<LoadErr>("");
  const [tries, setTries] = useState(0);
  const retry = useCallback(() => setTries((t) => t + 1), []);

  useEffect(() => {
    let alive = true;
    setErr("");
    fetcher()
      .then((d) => { if (alive) setData(d); })
      .catch((e: unknown) => { if (alive) setErr(classifyErr(e)); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tries]);

  return { data, err, retry, setData };
}

export function LoadGate({ err, retry, what }: { err: LoadErr; retry: () => void; what?: string }) {
  if (!err) return <div className="view"><p className="muted">Loading…</p></div>;
  const auth = err === "auth";
  return (
    <div className="view">
      <div className="dv-card" style={{ maxWidth: 560 }}>
        <h3 style={{ marginTop: 0 }}>{auth ? "Please sign in" : `Couldn't load ${what || "this page"}`}</h3>
        <p className="muted">
          {auth
            ? "Your session has expired, so this page can't load. Sign in and it will come straight back."
            : "Something went wrong fetching this page. Your data is safe — this is just the view."}
        </p>
        <div className="fb-row">
          {auth
            ? <button className="pt-go" onClick={() => { window.location.hash = "account"; }}>Sign in</button>
            : <button className="pt-go" onClick={retry}>Try again</button>}
        </div>
      </div>
    </div>
  );
}

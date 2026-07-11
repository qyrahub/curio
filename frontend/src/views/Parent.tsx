import { useEffect, useState } from "react";
import PageHero from "../components/PageHero";
import { api } from "../lib/api";
import type { ParentOverview } from "../types";

export default function Parent() {
  const [o, setO] = useState<ParentOverview | null>(null);
  const [reply, setReply] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [tries, setTries] = useState(0);

  useEffect(() => {
    let alive = true;
    setErr("");
    api.parentOverview()
      .then((x) => { if (alive) setO(x); })
      .catch((e: unknown) => {
        if (!alive) return;
        const msg = e instanceof Error ? e.message : String(e);
        setErr(/401|403|unauth|forbidden/i.test(msg) ? "auth" : "fail");
      });
    return () => { alive = false; };
  }, [tries]);

  const checkin = (r: string) => api.checkin(r).then((x) => setReply(x.reply)).catch(() => setReply("Couldn't send that just now — try again."));

  if (err) return (
    <div className="view">
      <div className="dv-card" style={{ maxWidth: 560 }}>
        <h3 style={{ marginTop: 0 }}>{err === "auth" ? "Please sign in" : "Couldn't load your overview"}</h3>
        <p className="muted">
          {err === "auth"
            ? "Your session has expired, so this page can't load. Sign in and it will come straight back."
            : "Something went wrong fetching this page. Your data is safe — this is just the view."}
        </p>
        <div className="fb-row">
          {err === "auth"
            ? <button className="pt-go" onClick={() => { window.location.hash = "account"; }}>Sign in</button>
            : <button className="pt-go" onClick={() => setTries((t) => t + 1)}>Try again</button>}
        </div>
      </div>
    </div>
  );

  if (!o) return <div className="view"><p className="muted">Loading…</p></div>;
  return (
    <div className="view">
      <PageHero kind="parent" eyebrow="For you" title={<>A calm view of <em>how it's going</em></>} tease="A gentle snapshot of your child's learning, with nudges and tips you can actually use today." />
      <div className="panel">
        <div className="eyebrow">Snapshot</div>
        <p className="lead">{o.snapshot.summary}</p>
        <div className="grid g3">
          <div className="stat"><b>{o.snapshot.plans_done}</b><span className="muted"> plans</span></div>
          <div className="stat"><b>{o.snapshot.streak_days}</b><span className="muted"> day streak</span></div>
          <div className="stat"><b>{o.snapshot.loves}</b><span className="muted"> loves</span></div>
        </div>
      </div>

      <h3>Today's nudges</h3>
      <div className="grid-cards g2">
        {o.nudges.map((n, i) => (
          <div key={i} className="nudge"><span className="nic">{n.icon}</span><div><b>{n.title}</b><p className="muted">{n.detail}</p></div></div>
        ))}
      </div>

      <div className="grid g2">
        <div className="tip-col">
          <h3>For your child</h3>
          {o.tips_child.map((t, i) => <div key={i} className="tip">{t}</div>)}
        </div>
        <div className="tip-col">
          <h3>For you</h3>
          {o.tips_self.map((t, i) => (
            <div key={i} className={"tip " + (t.kind === "avoid" ? "" : "good")}>
              <b>{t.kind === "avoid" ? "Avoid" : "Adopt"}:</b> {t.text}
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <h3>How did the last plan land?</h3>
        <div className="seg">
          {["loved it", "okay", "too hard", "too easy"].map((r) => (
            <button key={r} onClick={() => checkin(r)}>{r}</button>
          ))}
        </div>
        {reply && <p className="muted">{reply}</p>}
      </div>
    </div>
  );
}

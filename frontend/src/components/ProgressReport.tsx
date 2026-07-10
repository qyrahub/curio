import { useEffect, useMemo, useState } from "react";
import { growth, type ReviewCycle, type GrowthNeed, type Portrait } from "../lib/growth";
import { themeLevels, normTag } from "../lib/themes";
import { type ProgressData, printProgress, downloadProgressHTML, emailProgress, copyProgress } from "../lib/progressReport";

const dt = (r: ReviewCycle) => new Date(r.created_at || r.period || Date.now()).getTime();

export default function ProgressReport({ childId, childName }: { childId: string; childName: string }) {
  const [reviews, setReviews] = useState<ReviewCycle[]>([]);
  const [needs, setNeeds] = useState<GrowthNeed[]>([]);
  const [portrait, setPortrait] = useState<Portrait | null>(null);
  const [msg, setMsg] = useState("");
  const flash = (t: string) => { setMsg(t); setTimeout(() => setMsg(""), 2200); };

  useEffect(() => {
    Promise.all([
      growth.listReviews(childId).then(setReviews).catch(() => setReviews([])),
      growth.listNeeds(childId).then(setNeeds).catch(() => setNeeds([])),
      growth.listPortraits(childId).then((r) => setPortrait(r[0] || null)).catch(() => setPortrait(null)),
    ]);
  }, [childId]);

  const data: ProgressData = useMemo(() => {
    const sorted = reviews.slice().sort((a, b) => dt(a) - dt(b));
    const now = themeLevels(reviews);
    const strengths = Array.from(now.values()).filter((e) => e.strengths > 0).sort((a, b) => b.level - a.level).slice(0, 6).map((e) => ({ theme: e.theme, level: e.level }));
    const icount = new Map<string, number>();
    reviews.forEach((r) => (r.issues || []).map(normTag).filter(Boolean).forEach((t) => icount.set(t, (icount.get(t) || 0) + 1)));
    const issues = Array.from(icount.entries()).filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([theme, count]) => ({ theme, count }));
    const times = sorted.map(dt);
    const early = times.length ? themeLevels(reviews, times[Math.floor(times.length / 3)]) : now;
    const trajectory = strengths.slice(0, 4).map((s) => ({ theme: s.theme, then: early.get(s.theme)?.level ?? s.level, now: s.level }));
    const focus = needs.filter((n) => n.status !== "achieved").slice(0, 6).map((n) => n.title || n.area).filter(Boolean);
    return { childName, reviewCount: reviews.length, since: times.length ? new Date(times[0]).toLocaleDateString() : undefined, strengths, issues, trajectory, focus, portrait: portrait?.summary };
  }, [reviews, needs, portrait, childName]);

  const ready = reviews.length > 0;
  const doCopy = async () => flash((await copyProgress(data)) ? "Copied ✓" : "Copy not supported here");

  return (
    <div className="rx" style={{ borderBottom: "none", paddingBottom: 0, marginBottom: 0 }}>
      <span className="rx-label">Share {childName}'s progress:</span>
      <button className="rx-btn" disabled={!ready} onClick={() => printProgress(data)} title="Open a print view — Save as PDF">🖨 PDF</button>
      <button className="rx-btn" disabled={!ready} onClick={() => downloadProgressHTML(data)}>⬇ HTML</button>
      <button className="rx-btn" disabled={!ready} onClick={doCopy}>📋 Copy</button>
      <button className="rx-btn" disabled={!ready} onClick={() => emailProgress(data)}>✉️ Email</button>
      {!ready && <span className="muted" style={{ fontSize: ".82rem" }}>Submit a review to enable</span>}
      {msg && <span className="rx-msg">{msg}</span>}
    </div>
  );
}

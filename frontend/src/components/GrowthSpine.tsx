import { useEffect, useState } from "react";
import { growth, type GrowthNeed, type ReviewCycle } from "../lib/growth";
import { type GanttItem } from "../lib/devstore";

export default function GrowthSpine({ childId, gantt, accent }: { childId: string; gantt: GanttItem[]; accent: string }) {
  const [needs, setNeeds] = useState<GrowthNeed[]>([]);
  const [last, setLast] = useState<ReviewCycle | null>(null);
  useEffect(() => {
    growth.listNeeds(childId).then(setNeeds).catch(() => {});
    growth.listReviews(childId).then((r) => setLast(r[0] || null)).catch(() => {});
  }, [childId]);

  const active = needs.filter((n) => n.status !== "achieved").length;
  const achieved = needs.filter((n) => n.status === "achieved").length;
  const done = gantt.filter((g) => g.status === "done" || g.progress >= 100).length;
  const pct = gantt.length ? Math.round((done / gantt.length) * 100) : 0;
  const R = 22, C = 2 * Math.PI * R;

  return (
    <div className="spine" style={{ ["--sp-accent" as string]: accent }}>
      <div className="spine-card"><div className="spine-n">{active}</div><div className="spine-l">Active needs</div></div>
      <div className="spine-card"><div className="spine-n" style={{ color: "#5BBF8A" }}>{achieved}</div><div className="spine-l">Achieved</div></div>
      <div className="spine-card spine-ringcard">
        <svg width="56" height="56" viewBox="0 0 56 56">
          <circle cx="28" cy="28" r={R} fill="none" stroke="#e7e7ef" strokeWidth="6" />
          <circle cx="28" cy="28" r={R} fill="none" stroke={accent} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)} transform="rotate(-90 28 28)" />
          <text x="28" y="32" textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--ink)">{pct}%</text>
        </svg>
        <div className="spine-l">Plan progress</div>
      </div>
      <div className="spine-card spine-wide">
        <div className="spine-l">Last review</div>
        <div className="spine-rev">{last ? `${last.period || (last.created_at || "").slice(0, 10)} — ${last.summary || `${last.achieved.length} done, ${last.not_achieved.length} outstanding`}` : "No review yet — run one under Review."}</div>
      </div>
    </div>
  );
}

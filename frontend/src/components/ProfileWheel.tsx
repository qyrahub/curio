import { useEffect, useMemo, useState } from "react";
import { growth, type ReviewCycle } from "../lib/growth";
import { themeLevels, sectionOf, SECTIONS } from "../lib/themes";

/* Profile wheel — a grouped radial (sunburst) of the child's current levels.
   Spokes = themes, grouped into coloured sectors, ring depth = level, with a
   legend of exact percentages. Built only from the child's own history. */

const size = 380, PAD = 84, cx = size / 2, cy = size / 2, rIn = 46, rOut = size / 2 - 66;
const polar = (r: number, deg: number) => { const a = ((deg - 90) * Math.PI) / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
function wedge(rInner: number, rOuter: number, a0: number, a1: number) {
  const [x0o, y0o] = polar(rOuter, a0), [x1o, y1o] = polar(rOuter, a1);
  const [x1i, y1i] = polar(rInner, a1), [x0i, y0i] = polar(rInner, a0);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M${x0o},${y0o} A${rOuter},${rOuter} 0 ${large} 1 ${x1o},${y1o} L${x1i},${y1i} A${rInner},${rInner} 0 ${large} 0 ${x0i},${y0i} Z`;
}

export default function ProfileWheel({ childId, childName }: { childId: string; childName: string }) {
  const [reviews, setReviews] = useState<ReviewCycle[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { setLoaded(false); growth.listReviews(childId).then(setReviews).catch(() => setReviews([])).finally(() => setLoaded(true)); }, [childId]);

  const spokes = useMemo(() => {
    const m = themeLevels(reviews);
    return Array.from(m.values()).map((e) => ({ theme: e.theme, level: e.level, sec: sectionOf(e.theme) }))
      .sort((a, b) => a.sec - b.sec || b.level - a.level);
  }, [reviews]);

  if (!loaded) return <div className="muted">Loading…</div>;
  if (spokes.length < 3) return <div className="evo-empty">The profile wheel builds once {childName} has a few themes — submit some reviews.</div>;

  const N = spokes.length, gap = 1.5, per = 360 / N;
  // sector bands (consecutive same-sec spokes)
  const bands: { sec: number; a0: number; a1: number }[] = [];
  spokes.forEach((s, i) => {
    const a0 = i * per, a1 = (i + 1) * per;
    const last = bands[bands.length - 1];
    if (last && last.sec === s.sec) last.a1 = a1; else bands.push({ sec: s.sec, a0, a1 });
  });
  const used = new Set(spokes.map((s) => s.sec));

  return (
    <div className="pw">
      <svg viewBox={`${-PAD} 0 ${size + 2 * PAD} ${size}`} width="100%" style={{ maxWidth: size + 2 * PAD }}>
        {[25, 50, 75, 100].map((lv) => <circle key={lv} cx={cx} cy={cy} r={rIn + (lv / 100) * (rOut - rIn)} fill="none" stroke="var(--ring)" strokeWidth={1} opacity={0.4} />)}
        {spokes.map((s, i) => {
          const a0 = i * per + gap, a1 = (i + 1) * per - gap;
          const col = SECTIONS[s.sec].color;
          const rv = rIn + (s.level / 100) * (rOut - rIn);
          return <g key={s.theme}>
            <path d={wedge(rIn, rOut, a0, a1)} fill={col} opacity={0.1} />
            <path d={wedge(rIn, rv, a0, a1)} fill={col} opacity={0.85} />
          </g>;
        })}
        {bands.map((b, i) => <path key={i} d={wedge(rOut + 6, rOut + 14, b.a0 + gap, b.a1 - gap)} fill={SECTIONS[b.sec].color} opacity={0.9} />)}
        {spokes.map((s, i) => {
          const mid = i * per + per / 2;
          const [lx, ly] = polar(rOut + 22, mid);
          return <text key={s.theme} x={lx} y={ly} className="pw-lab" textAnchor={Math.abs(lx - cx) < 8 ? "middle" : lx > cx ? "start" : "end"}>{s.theme.length > 20 ? s.theme.slice(0, 19) + "…" : s.theme}</text>;
        })}
        <text x={cx} y={cy + 4} textAnchor="middle" className="pw-center">{childName}</text>
      </svg>
      <div className="pw-legend">
        {SECTIONS.map((sec, si) => used.has(si as 0 | 1 | 2) && (
          <div className="pw-leggroup" key={si}>
            <div className="pw-legtitle" style={{ color: sec.color }}>{sec.title}</div>
            {spokes.filter((s) => s.sec === si).map((s) => (
              <div className="pw-legrow" key={s.theme}><span>{s.theme}</span><b>{s.level}%</b></div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

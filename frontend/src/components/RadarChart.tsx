/* Pure-SVG radar. Axes scale to however many themes are passed in. */
export interface RadarSeries { name: string; color: string; values: number[]; dashed?: boolean; }

export default function RadarChart({ labels, series, size = 300 }: { labels: string[]; series: RadarSeries[]; size?: number }) {
  const N = labels.length;
  if (N < 3) return <div className="muted" style={{ padding: 16 }}>Need at least 3 themes for a radar — submit a few more reviews.</div>;
  const cx = size / 2, cy = size / 2, R = size / 2 - 54;
  const ang = (i: number) => (Math.PI * 2 * i) / N - Math.PI / 2;
  const pt = (i: number, v: number) => [cx + R * (Math.max(0, Math.min(100, v)) / 100) * Math.cos(ang(i)), cy + R * (Math.max(0, Math.min(100, v)) / 100) * Math.sin(ang(i))];
  const poly = (vals: number[]) => vals.map((v, i) => pt(i, v).join(",")).join(" ");
  const rings = [25, 50, 75, 100];
  return (
    <div className="radar">
      <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: size }}>
        {rings.map((lv) => <polygon key={lv} points={labels.map((_, i) => pt(i, lv).join(",")).join(" ")} fill="none" stroke="var(--ring)" strokeWidth={1} opacity={0.5} />)}
        {labels.map((_, i) => { const [x, y] = pt(i, 100); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--ring)" strokeWidth={1} opacity={0.5} />; })}
        {series.map((s, si) => (
          <polygon key={si} points={poly(s.values)} fill={s.color + "22"} stroke={s.color} strokeWidth={2} strokeDasharray={s.dashed ? "5 4" : undefined} />
        ))}
        {series.map((s, si) => s.values.map((v, i) => { const [x, y] = pt(i, v); return <circle key={si + "-" + i} cx={x} cy={y} r={2.5} fill={s.color} />; }))}
        {labels.map((l, i) => { const [x, y] = pt(i, 116); return <text key={i} x={x} y={y} className="radar-lab" textAnchor={Math.abs(x - cx) < 6 ? "middle" : x > cx ? "start" : "end"}>{l.length > 16 ? l.slice(0, 15) + "…" : l}</text>; })}
      </svg>
      <div className="radar-legend">
        {series.map((s, si) => <span key={si} className="radar-leg"><span className="radar-dot" style={{ background: s.color }} />{s.name}</span>)}
      </div>
    </div>
  );
}

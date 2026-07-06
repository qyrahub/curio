import { useEffect, useMemo, useState } from "react";
import { growth, type ReviewCycle } from "../lib/growth";
import { themeLevels } from "../lib/themes";

/* Value created — dynamic tiles, one per emerging strength theme, growing as new
   themes are identified from the child's ecosystem. Real, from the child's history. */
export default function ValueTiles({ childId, childName, accent }: { childId: string; childName: string; accent: string }) {
  const [reviews, setReviews] = useState<ReviewCycle[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { setLoaded(false); growth.listReviews(childId).then(setReviews).catch(() => setReviews([])).finally(() => setLoaded(true)); }, [childId]);

  const tiles = useMemo(() => {
    const m = themeLevels(reviews);
    return Array.from(m.values()).filter((e) => e.strengths > 0).sort((a, b) => b.level - a.level).slice(0, 12);
  }, [reviews]);

  if (!loaded) return <div className="muted">Loading…</div>;
  if (tiles.length === 0) return <div className="evo-empty">Value tiles appear here as {childName}'s strengths emerge from submitted reviews — new themes are added automatically.</div>;

  return (
    <div className="vtiles" style={{ ["--vt-accent" as string]: accent }}>
      {tiles.map((t) => (
        <div className="vtile" key={t.theme}>
          <div className="vtile-lvl">{t.level}</div>
          <div className="vtile-name">{t.theme}</div>
          <div className="vtile-bar"><span style={{ width: t.level + "%" }} /></div>
          <div className="vtile-seen">seen {Math.round(t.strengths)}×</div>
        </div>
      ))}
    </div>
  );
}

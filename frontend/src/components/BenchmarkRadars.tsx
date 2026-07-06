import { useEffect, useMemo, useState } from "react";
import { growth, type ReviewCycle, type Benchmark } from "../lib/growth";
import { topThemes, themeLevels, ageGroup } from "../lib/themes";
import RadarChart from "./RadarChart";

/* Three radars: child vs world, child vs their country, child vs their own past.
   Axes are the child's own top themes (dynamic). Child values come only from
   their history (real). Benchmark rings come from admin-approved typical-for-age
   data; where a theme has no benchmark it's marked * and not treated as a gap. */

const dateOf = (r: ReviewCycle) => new Date(r.created_at || r.period || Date.now()).getTime();

export default function BenchmarkRadars({ childId, childName, childAge, country }: { childId: string; childName: string; childAge: number; country?: string }) {
  const [reviews, setReviews] = useState<ReviewCycle[]>([]);
  const [world, setWorld] = useState<Benchmark[]>([]);
  const [ctry, setCtry] = useState<Benchmark[]>([]);
  const [loaded, setLoaded] = useState(false);
  const ag = ageGroup(childAge);

  useEffect(() => {
    setLoaded(false);
    Promise.all([
      growth.listReviews(childId).then(setReviews).catch(() => setReviews([])),
      growth.benchmarks("world", "", ag).then(setWorld).catch(() => setWorld([])),
      country ? growth.benchmarks("country", country, ag).then(setCtry).catch(() => setCtry([])) : Promise.resolve(setCtry([])),
    ]).finally(() => setLoaded(true));
  }, [childId, ag, country]);

  const model = useMemo(() => {
    const labels = topThemes(reviews, 8);
    const now = themeLevels(reviews);
    const childVals = labels.map((t) => now.get(t)?.level ?? 30);
    const bmMap = (arr: Benchmark[]) => new Map(arr.map((b) => [b.theme, b.value]));
    const wMap = bmMap(world), cMap = bmMap(ctry);
    const worldVals = labels.map((t) => wMap.get(t) ?? -1);
    const ctryVals = labels.map((t) => cMap.get(t) ?? -1);
    // earliest snapshot for own-history
    const times = reviews.map(dateOf).sort((a, b) => a - b);
    const early = times.length ? themeLevels(reviews, times[Math.floor(times.length / 3)]) : now;
    const thenVals = labels.map((t) => early.get(t)?.level ?? 30);
    const fill = (vals: number[]) => vals.map((v, i) => (v < 0 ? childVals[i] : v)); // no fabricated gap
    const anyW = worldVals.some((v) => v >= 0), anyC = ctryVals.some((v) => v >= 0);
    return { labels, childVals, worldVals: fill(worldVals), ctryVals: fill(ctryVals), thenVals, anyW, anyC,
      starW: labels.map((_, i) => worldVals[i] < 0), starC: labels.map((_, i) => ctryVals[i] < 0) };
  }, [reviews, world, ctry]);

  if (!loaded) return <div className="muted">Loading…</div>;
  if (model.labels.length < 3) return <div className="evo-empty">Submit a few reviews for {childName} and the radars build from the themes that emerge.</div>;

  return (
    <div className="radars">
      <div className="radar-card">
        <h4>vs World <span className="muted">· typical for age {model.labels.length ? childAge : ""}</span></h4>
        {model.anyW ? <RadarChart labels={model.labels} series={[{ name: childName, color: "#5AA7E6", values: model.childVals }, { name: "World (typical)", color: "#8A8AA0", values: model.worldVals, dashed: true }]} />
          : <div className="evo-empty">No world benchmarks set for age {ageGroup(childAge)}. Add them under Admin → Benchmarks.</div>}
      </div>
      <div className="radar-card">
        <h4>vs {country || "your country"} <span className="muted">· typical for age</span></h4>
        {!country ? <div className="evo-empty">Set {childName}'s country under Develop → ⚙ Settings to compare nationally.</div>
          : model.anyC ? <RadarChart labels={model.labels} series={[{ name: childName, color: "#5AA7E6", values: model.childVals }, { name: `${country} (typical)`, color: "#FF7A66", values: model.ctryVals, dashed: true }]} />
          : <div className="evo-empty">No {country} benchmarks set for age {ageGroup(childAge)}. Add them under Admin → Benchmarks.</div>}
      </div>
      <div className="radar-card">
        <h4>vs Own history <span className="muted">· then → now</span></h4>
        <RadarChart labels={model.labels} series={[{ name: "Earlier", color: "#B0A8C8", values: model.thenVals, dashed: true }, { name: "Now", color: "#5BBF8A", values: model.childVals }]} />
      </div>
      {(model.starW.some(Boolean) || model.starC.some(Boolean)) && <p className="muted radar-foot">Themes without a set benchmark are shown level with the child (no assumed gap). Benchmarks are typical-for-age references, not measured percentiles.</p>}
    </div>
  );
}

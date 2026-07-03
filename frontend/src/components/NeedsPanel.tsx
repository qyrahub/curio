import { useEffect, useState } from "react";
import { growth, NEED_STATUS, type GrowthNeed, type NeedStatus, feedBrain } from "../lib/growth";

export default function NeedsPanel({ childId, childName, accent }: { childId: string; childName: string; accent: string }) {
  const [needs, setNeeds] = useState<GrowthNeed[]>([]);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState("");
  const [title, setTitle] = useState("");
  const [area, setArea] = useState("");

  useEffect(() => {
    setBusy(true); setErr("");
    growth.listNeeds(childId).then(setNeeds).catch(() => setErr("Couldn't load needs — check you're signed in.")).finally(() => setBusy(false));
  }, [childId]);

  const add = async () => {
    if (!title.trim()) return;
    try {
      const n = await growth.putNeed({ child_id: childId, title: title.trim(), area: area.trim() || "General", status: "emerging" });
      setNeeds((x) => [n, ...x]); setTitle(""); setArea("");
    } catch { setErr("Couldn't save that need."); }
  };
  const setStatus = async (n: GrowthNeed, status: NeedStatus) => {
    try {
      const u = await growth.putNeed({ ...n, status });
      setNeeds((x) => x.map((y) => (y.id === n.id ? u : y)));
      if (status === "achieved") feedBrain(`${childName} achieved a development need: "${n.title}" (${n.area}).`, "Growth · need achieved");
    } catch { setErr("Couldn't update status."); }
  };
  const del = async (n: GrowthNeed) => { try { await growth.delNeed(n.id); setNeeds((x) => x.filter((y) => y.id !== n.id)); } catch { setErr("Couldn't delete."); } };

  return (
    <div className="needs" style={{ ["--n-accent" as string]: accent }}>
      <div className="needs-add">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`A development need for ${childName}…`} onKeyDown={(e) => e.key === "Enter" && add()} />
        <input className="needs-area" value={area} onChange={(e) => setArea(e.target.value)} placeholder="Area (e.g. Focus)" onKeyDown={(e) => e.key === "Enter" && add()} />
        <button className="needs-go" onClick={add}>＋ Add need</button>
      </div>
      {err && <div className="needs-err">{err}</div>}
      {busy ? <div className="needs-empty">Loading…</div>
        : needs.length === 0 ? <div className="needs-empty">No needs yet. Add one above, or add recommendations from Evaluate / Plan &amp; Tracker.</div>
          : (
            <div className="needs-list">
              {needs.map((n) => {
                const st = NEED_STATUS.find((s) => s.key === n.status) || NEED_STATUS[0];
                return (
                  <div className="need" key={n.id} style={{ borderLeftColor: st.color }}>
                    <div className="need-main">
                      <div className="need-title">{n.title}</div>
                      <div className="need-area">{n.area}</div>
                    </div>
                    <div className="need-status">
                      {NEED_STATUS.map((s) => (
                        <button key={s.key} className={"need-chip" + (n.status === s.key ? " on" : "")}
                          style={n.status === s.key ? { background: s.color, borderColor: s.color, color: "#fff" } : { borderColor: s.color + "66", color: s.color }}
                          onClick={() => setStatus(n, s.key)}>{s.label}</button>
                      ))}
                    </div>
                    <button className="need-x" title="Remove" onClick={() => del(n)}>✕</button>
                  </div>
                );
              })}
            </div>
          )}
    </div>
  );
}

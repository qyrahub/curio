/* Child-level Progress Report — aggregates a child's whole tracked history into one
   honest, shareable summary. Real data only; the Brain read is labelled inference. */

export interface ProgressData {
  childName: string;
  reviewCount: number;
  since?: string;
  strengths: { theme: string; level: number }[];
  issues: { theme: string; count: number }[];
  trajectory: { theme: string; then: number; now: number }[];
  focus: string[];
  portrait?: string;
}

function esc(s: string): string {
  return (s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
}

const STYLE = `
  body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#fff;color:#23223a;margin:0;padding:30px;max-width:820px}
  h1{font-size:1.5rem;margin:0 0 2px} .sub{color:#6b6a86;margin:0 0 20px;font-size:.86rem}
  h2{font-size:1.02rem;margin:22px 0 8px;color:#3b3960}
  .read{background:#F4F2FB;border-left:4px solid #5AA7E6;border-radius:12px;padding:14px 16px;margin-bottom:16px;line-height:1.5}
  .read .lab{font-size:.7rem;letter-spacing:.12em;text-transform:uppercase;color:#5AA7E6;font-weight:700;margin-bottom:4px}
  .row{display:flex;align-items:center;gap:10px;margin:7px 0}
  .row .n{flex:1;font-weight:600} .row .c{font-size:.8rem;color:#6b6a86}
  .bar{flex:1;height:9px;background:#EEE;border-radius:99px;overflow:hidden;max-width:320px}
  .bar i{display:block;height:100%;border-radius:99px}
  .good i{background:#3FA66E} .watch i{background:#E4634C}
  .traj{display:flex;gap:10px;align-items:baseline;margin:6px 0;font-size:.95rem}
  .traj b{width:150px;display:inline-block;font-weight:600} .up{color:#3FA66E;font-weight:700} .down{color:#E4634C;font-weight:700}
  ul{margin:.3rem 0;padding-left:20px} li{margin:.3rem 0}
  .foot{margin-top:22px;color:#8a8aa0;font-size:.76rem;font-style:italic;border-top:1px solid #eee;padding-top:12px}
  .empty{color:#8a8aa0;font-style:italic}
`;

export function buildProgressHTML(d: ProgressData): string {
  const strengths = d.strengths.length
    ? d.strengths.map((s) => `<div class="row good"><span class="n">${esc(s.theme)}</span><span class="bar"><i style="width:${s.level}%"></i></span><span class="c">${s.level}</span></div>`).join("")
    : `<p class="empty">Emerging — not enough history yet.</p>`;
  const issues = d.issues.length
    ? d.issues.map((i) => `<div class="row watch"><span class="n">${esc(i.theme)}</span><span class="c">seen ${i.count}×</span></div>`).join("")
    : `<p class="empty">No recurring issues flagged.</p>`;
  const traj = d.trajectory.length
    ? d.trajectory.map((t) => { const dlt = t.now - t.then; const cls = dlt > 0 ? "up" : dlt < 0 ? "down" : ""; const ar = dlt > 0 ? "▲" : dlt < 0 ? "▼" : "—"; return `<div class="traj"><b>${esc(t.theme)}</b> ${t.then} → ${t.now} <span class="${cls}">${ar} ${Math.abs(dlt)}</span></div>`; }).join("")
    : "";
  const focus = d.focus.length ? `<ul>${d.focus.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>` : `<p class="empty">No active focus recorded.</p>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(d.childName)} — Progress Report</title><style>${STYLE}</style></head><body>
    <h1>${esc(d.childName)} — Progress Report</h1>
    <p class="sub">${new Date().toLocaleDateString()} · from ${d.reviewCount} review${d.reviewCount === 1 ? "" : "s"}${d.since ? ` since ${esc(d.since)}` : ""} · Curio</p>
    ${d.portrait ? `<div class="read"><div class="lab">The Brain's read — an inference from history, not a diagnosis</div>${esc(d.portrait)}</div>` : ""}
    <h2>Strengths</h2>${strengths}
    ${traj ? `<h2>Trajectory — earlier → now</h2>${traj}` : ""}
    <h2>Recurring watch-points</h2>${issues}
    <h2>Current focus</h2>${focus}
    <p class="foot">Levels and trends are computed from ${esc(d.childName)}'s own dated history — not measured percentiles. This is guidance for the family, not a clinical or diagnostic assessment.</p>
  </body></html>`;
}

function progressText(d: ProgressData): string {
  const L: string[] = [`${d.childName} — Progress Report (${new Date().toLocaleDateString()})`, `From ${d.reviewCount} reviews${d.since ? ` since ${d.since}` : ""}.`, ""];
  if (d.portrait) L.push("READ (inference from history):", "  " + d.portrait, "");
  L.push("STRENGTHS:"); d.strengths.forEach((s) => L.push(`  • ${s.theme} (${s.level})`));
  if (d.trajectory.length) { L.push("", "TRAJECTORY:"); d.trajectory.forEach((t) => L.push(`  • ${t.theme}: ${t.then} → ${t.now}`)); }
  L.push("", "RECURRING WATCH-POINTS:"); d.issues.forEach((i) => L.push(`  • ${i.theme} (seen ${i.count}×)`));
  L.push("", "CURRENT FOCUS:"); d.focus.forEach((f) => L.push(`  • ${f}`));
  return L.join("\n");
}

function download(blob: Blob, name: string) {
  const u = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = u; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}
export function downloadProgressHTML(d: ProgressData) { download(new Blob([buildProgressHTML(d)], { type: "text/html" }), `${d.childName}-progress.html`); }
export function printProgress(d: ProgressData) { const w = window.open("", "_blank"); if (!w) return; w.document.write(buildProgressHTML(d)); w.document.close(); w.focus(); setTimeout(() => w.print(), 350); }
export function emailProgress(d: ProgressData) { window.location.href = `mailto:?subject=${encodeURIComponent(`${d.childName} — Progress Report`)}&body=${encodeURIComponent(progressText(d))}`; }
export async function copyProgress(d: ProgressData): Promise<boolean> {
  try {
    const nav = navigator as Navigator & { clipboard?: { write?: (i: ClipboardItem[]) => Promise<void>; writeText?: (t: string) => Promise<void> } };
    if (nav.clipboard?.write && typeof ClipboardItem !== "undefined") {
      await nav.clipboard.write([new ClipboardItem({ "text/html": new Blob([buildProgressHTML(d)], { type: "text/html" }), "text/plain": new Blob([progressText(d)], { type: "text/plain" }) })]);
    } else { await nav.clipboard?.writeText?.(progressText(d)); }
    return true;
  } catch { return false; }
}

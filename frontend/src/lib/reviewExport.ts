/* Export a completed Review in the same formatting — HTML download, print/PDF,
   PNG snapshot (html2canvas lazy-loaded from CDN), rich clipboard copy, email. */

export interface ReviewExportData {
  childName: string;
  summary: string;
  working: { point: string; implication: string }[];
  watch: { point: string; implication: string }[];
  recommendations: { task: string; focus: string; durationDays: number }[];
  issues?: string[];
  strengths?: string[];
}

export function buildReviewHTML(d: ReviewExportData): string {
  const li = (items: { point: string; implication: string }[]) =>
    items.map((i) => `<li><b>${esc(i.point)}.</b> ${esc(i.implication)}</li>`).join("");
  const recs = d.recommendations.map((r) =>
    `<div class="rec"><div class="task">${esc(r.task)}</div><div class="meta"><span class="focus">${esc(r.focus)}</span> · ≈ ${r.durationDays} days</div></div>`).join("");
  const tags = (arr?: string[]) => (arr && arr.length ? arr.map((t) => `<span class="tag">${esc(t)}</span>`).join("") : "");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(d.childName)} — Development Review</title>
<style>
  body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#fff;color:#23223a;margin:0;padding:28px;max-width:820px}
  h1{font-size:1.4rem;margin:0 0 4px} .sub{color:#6b6a86;margin:0 0 18px;font-size:.85rem}
  .summary{background:#F4F2FB;border-left:4px solid #5AA7E6;border-radius:12px;padding:14px 16px;font-size:1.05rem;line-height:1.5;margin-bottom:16px}
  .board{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:16px}
  .col{flex:1;min-width:260px;border-radius:14px;padding:14px 16px;border:1px solid}
  .good{background:#EAF8F0;border-color:#BEE7D0;color:#1C6B45}
  .bad{background:#FDECE8;border-color:#F6CFC5;color:#A63A26}
  .col h3{margin:0 0 8px;font-size:1rem} .col ul{margin:0;padding-left:18px} .col li{margin-bottom:6px;line-height:1.4}
  h2{font-size:1.05rem;margin:18px 0 8px}
  .rec{border:1px solid #E7E3F0;border-radius:12px;padding:10px 13px;margin-bottom:8px}
  .task{font-weight:700} .meta{font-size:.82rem;color:#6b6a86;margin-top:2px}
  .focus{color:#5AA7E6;font-weight:700;text-transform:uppercase;font-size:.72rem}
  .tags{margin-top:10px} .tag{display:inline-block;background:#EEF;border:1px solid #DDE;border-radius:999px;padding:3px 10px;font-size:.75rem;margin:0 6px 6px 0;color:#4a4a6a}
  .foot{margin-top:20px;color:#8a8aa0;font-size:.75rem;font-style:italic}
</style></head><body>
  <h1>${esc(d.childName)} — Development Review</h1>
  <p class="sub">${new Date().toLocaleDateString()} · Curio</p>
  <div class="summary">${esc(d.summary)}</div>
  <div class="board">
    <div class="col good"><h3>✅ Working / strengths</h3><ul>${li(d.working)}</ul></div>
    <div class="col bad"><h3>⚠️ To work on / be aware of</h3><ul>${li(d.watch)}</ul></div>
  </div>
  <h2>Recommendations</h2>${recs}
  ${d.issues && d.issues.length ? `<div class="tags"><b style="font-size:.8rem">Issues:</b> ${tags(d.issues)}</div>` : ""}
  ${d.strengths && d.strengths.length ? `<div class="tags"><b style="font-size:.8rem">Strengths:</b> ${tags(d.strengths)}</div>` : ""}
  <p class="foot">Practical guidance to support your parenting — not a diagnosis or medical advice.</p>
</body></html>`;
}

export function reviewFragment(d: ReviewExportData): string {
  const full = buildReviewHTML(d);
  const style = full.match(/<style>[\s\S]*?<\/style>/)?.[0] || "";
  const body = full.match(/<body>([\s\S]*?)<\/body>/)?.[1] || "";
  return style + body;
}

function esc(s: string): string {
  return (s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
}
function reviewText(d: ReviewExportData): string {
  const lines = [`${d.childName} — Development Review (${new Date().toLocaleDateString()})`, "", d.summary, "", "WORKING / STRENGTHS:"];
  d.working.forEach((i) => lines.push(`  • ${i.point}. ${i.implication}`));
  lines.push("", "TO WORK ON:");
  d.watch.forEach((i) => lines.push(`  • ${i.point}. ${i.implication}`));
  lines.push("", "RECOMMENDATIONS:");
  d.recommendations.forEach((r) => lines.push(`  • ${r.task} (${r.focus}, ~${r.durationDays} days)`));
  return lines.join("\n");
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadHTML(d: ReviewExportData) {
  downloadBlob(new Blob([buildReviewHTML(d)], { type: "text/html" }), `${d.childName}-review.html`);
}
export function printPDF(d: ReviewExportData) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(buildReviewHTML(d));
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 350);
}
export function emailReview(d: ReviewExportData) {
  const subject = encodeURIComponent(`${d.childName} — Development Review`);
  const body = encodeURIComponent(reviewText(d));
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
}
export async function copyReview(d: ReviewExportData): Promise<boolean> {
  try {
    const nav = navigator as Navigator & { clipboard?: { write?: (items: ClipboardItem[]) => Promise<void>; writeText?: (t: string) => Promise<void> } };
    if (nav.clipboard?.write && typeof ClipboardItem !== "undefined") {
      await nav.clipboard.write([new ClipboardItem({
        "text/html": new Blob([buildReviewHTML(d)], { type: "text/html" }),
        "text/plain": new Blob([reviewText(d)], { type: "text/plain" }),
      })]);
    } else {
      await nav.clipboard?.writeText?.(reviewText(d));
    }
    return true;
  } catch { return false; }
}

type H2C = (el: HTMLElement, opts?: Record<string, unknown>) => Promise<HTMLCanvasElement>;
async function loadHtml2Canvas(): Promise<H2C> {
  const w = window as unknown as { html2canvas?: H2C };
  if (w.html2canvas) return w.html2canvas;
  await new Promise<void>((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
    s.onload = () => res(); s.onerror = () => rej(new Error("html2canvas load failed"));
    document.head.appendChild(s);
  });
  if (!w.html2canvas) throw new Error("html2canvas unavailable");
  return w.html2canvas;
}
export async function snapshotPNG(node: HTMLElement | null, childName: string, data?: ReviewExportData): Promise<boolean> {
  let temp: HTMLElement | null = null;
  try {
    const h2c = await loadHtml2Canvas();
    let target: HTMLElement | null = node;
    if (data) {
      temp = document.createElement("div");
      temp.style.cssText = "position:fixed;left:-10000px;top:0;width:820px;background:#ffffff";
      temp.innerHTML = reviewFragment(data);
      document.body.appendChild(temp);
      target = temp;
    }
    if (!target) return false;
    const canvas = await h2c(target, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
    await new Promise<void>((res) => canvas.toBlob((b) => { if (b) downloadBlob(b, `${childName}-review.png`); res(); }, "image/png"));
    return true;
  } catch { return false; }
  finally { if (temp && temp.parentNode) temp.parentNode.removeChild(temp); }
}

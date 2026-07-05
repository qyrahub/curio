import { useState } from "react";
import { type ReviewExportData, downloadHTML, printPDF, emailReview, copyReview, snapshotPNG } from "../lib/reviewExport";

export default function ReviewExport({ data, targetRef }: { data: ReviewExportData; targetRef: React.RefObject<HTMLDivElement | null> }) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const flash = (t: string) => { setMsg(t); setTimeout(() => setMsg(""), 2200); };

  const doCopy = async () => { flash((await copyReview(data)) ? "Copied to clipboard ✓" : "Copy not supported here"); };
  const doSnap = async () => {
    if (!targetRef.current) return;
    setBusy(true);
    const ok = await snapshotPNG(targetRef.current, data.childName);
    setBusy(false);
    flash(ok ? "Image saved ✓" : "Snapshot failed — try Print → Save as PDF");
  };

  return (
    <div className="rx">
      <span className="rx-label">Export:</span>
      <button className="rx-btn" onClick={() => printPDF(data)} title="Open a print view — choose Save as PDF">🖨 PDF</button>
      <button className="rx-btn" onClick={() => downloadHTML(data)} title="Download as a formatted HTML file">⬇ HTML</button>
      <button className="rx-btn" disabled={busy} onClick={doSnap} title="Save a picture of this review">{busy ? "…" : "📸 Snapshot"}</button>
      <button className="rx-btn" onClick={doCopy} title="Copy formatted review">📋 Copy</button>
      <button className="rx-btn" onClick={() => emailReview(data)} title="Open an email with the review">✉️ Email</button>
      {msg && <span className="rx-msg">{msg}</span>}
    </div>
  );
}

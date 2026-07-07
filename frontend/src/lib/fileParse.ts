/* Client-side text extraction for Needs "File" input — .txt directly, .pdf via
   pdf.js and .docx via mammoth, both lazy-loaded from CDN (no backend dependency).
   Returns plain text the analysis flow treats exactly like typed/URL material. */

type Win = Window & {
  pdfjsLib?: { GlobalWorkerOptions: { workerSrc: string }; getDocument: (o: unknown) => { promise: Promise<PdfDoc> } };
  mammoth?: { extractRawText: (o: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }> };
};
interface PdfDoc { numPages: number; getPage: (n: number) => Promise<PdfPage>; }
interface PdfPage { getTextContent: () => Promise<{ items: { str?: string }[] }>; }

function loadScript(src: string): Promise<void> {
  return new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
    const s = document.createElement("script");
    s.src = src; s.onload = () => res(); s.onerror = () => rej(new Error("load failed: " + src));
    document.head.appendChild(s);
  });
}

const PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDFJS_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
const MAMMOTH = "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js";

export async function extractFileText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".txt") || file.type.startsWith("text/") || name.endsWith(".md") || name.endsWith(".csv")) {
    return (await file.text()).slice(0, 12000);
  }
  if (name.endsWith(".docx")) {
    await loadScript(MAMMOTH);
    const w = window as Win;
    if (!w.mammoth) throw new Error("docx reader unavailable");
    const r = await w.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return (r.value || "").slice(0, 12000);
  }
  if (name.endsWith(".pdf")) {
    await loadScript(PDFJS);
    const w = window as Win;
    if (!w.pdfjsLib) throw new Error("pdf reader unavailable");
    w.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
    const doc = await w.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    let out = "";
    for (let i = 1; i <= Math.min(doc.numPages, 20); i++) {
      const pg = await doc.getPage(i);
      const tc = await pg.getTextContent();
      out += tc.items.map((it) => it.str || "").join(" ") + "\n";
      if (out.length > 12000) break;
    }
    return out.trim().slice(0, 12000);
  }
  throw new Error("Unsupported file — use PDF, Word (.docx) or a text file.");
}

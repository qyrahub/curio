import { api } from "./api";

/* Small helpers for driving the /ask LLM endpoint and parsing JSON replies. */
export function grabJSON<T>(reply: string): T | null {
  try {
    const a = reply.indexOf("{"), b = reply.lastIndexOf("}");
    if (a < 0 || b < 0) return null;
    return JSON.parse(reply.slice(a, b + 1)) as T;
  } catch { return null; }
}
export async function askJSON<T>(prompt: string): Promise<T | null> {
  try { const r = await api.ask(prompt, { mode: "develop" }); return grabJSON<T>(r.reply); }
  catch { return null; }
}

export async function askVisionJSON<T>(prompt: string, image: string, mediaType: string): Promise<T | null> {
  try { const r = await api.askVision(prompt, image, mediaType, "develop"); return grabJSON<T>(r.reply); }
  catch { return null; }
}

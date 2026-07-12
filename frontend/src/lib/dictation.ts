import { useCallback, useRef, useState } from "react";

/* Reusable Web Speech dictation hook. Pattern lifted from GrowthFlow's inline
   dictate() — abstracted here so the Journal's three modes (personal /
   conversation / dialogue) can each drop in a mic button without duplicating
   the recogniser wiring. The API is deliberately small:

   const { listening, supported, start, stop } = useDictation({
     onResult: (transcript) => setText(t => t + " " + transcript),
     lang: "en-ZA",
   });

   Web Speech doesn't do speaker separation, so for conversation/dialogue modes
   the pattern is: parent taps the speaker-A mic, talks, then taps speaker-B
   mic and talks — each dictation is attributed by which button started it.

   Non-Chrome/Edge browsers get supported=false; callers should hide the mic
   button in that case rather than showing a broken control. */

interface SRResult { transcript: string; }
interface SREvent { results: ArrayLike<ArrayLike<SRResult>>; resultIndex: number; }
interface SRInstance {
  lang: string;
  interimResults: boolean;
  continuous?: boolean;
  onresult: (e: SREvent) => void;
  onend: () => void;
  onerror: () => void;
  start: () => void;
  stop: () => void;
  abort?: () => void;
}
type SRCtor = new () => SRInstance;

function getSR(): SRCtor | null {
  const W = window as unknown as { webkitSpeechRecognition?: SRCtor; SpeechRecognition?: SRCtor };
  return W.SpeechRecognition || W.webkitSpeechRecognition || null;
}

export const dictationSupported = typeof window !== "undefined" && !!getSR();

export function useDictation({ onResult, lang = "en-ZA", continuous = true }: {
  onResult: (transcript: string) => void;
  lang?: string;
  continuous?: boolean;
}) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SRInstance | null>(null);

  const start = useCallback(() => {
    const SR = getSR();
    if (!SR) { setError("Dictation needs Chrome or Edge."); return; }
    // If a previous session is still winding down, drop it before starting.
    try { recRef.current?.abort?.(); } catch { /* ignore */ }
    const rec = new SR();
    rec.lang = lang;
    rec.interimResults = false;
    rec.continuous = continuous;
    rec.onresult = (ev) => {
      // Only take the newest final results since resultIndex.
      let chunk = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const first = ev.results[i][0];
        if (first) chunk += (chunk ? " " : "") + first.transcript;
      }
      if (chunk) onResult(chunk.trim());
    };
    rec.onend = () => { setListening(false); recRef.current = null; };
    rec.onerror = () => { setListening(false); recRef.current = null; };
    recRef.current = rec;
    setError(null);
    setListening(true);
    try { rec.start(); } catch { setListening(false); recRef.current = null; }
  }, [onResult, lang, continuous]);

  const stop = useCallback(() => {
    try { recRef.current?.stop(); } catch { /* ignore */ }
  }, []);

  return { listening, supported: dictationSupported, error, start, stop };
}

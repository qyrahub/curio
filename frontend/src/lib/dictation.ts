import { useCallback, useRef, useState } from "react";

/* Reusable Web Speech dictation hook.

   This is the second iteration — the first shipped with three latent bugs
   that surfaced as a "quick click blip" when the mic button was tapped:
   (1) `setListening(true)` fired optimistically before rec.start(), so if
   onerror or a fast onend fired immediately the state toggled on-off without
   the mic ever engaging; (2) `interimResults=false` + `continuous=true` is a
   known Chrome combination where results never fire; (3) errors were
   silently swallowed. All three are fixed here.

   Chrome-specific quirks handled:
   - onstart is the truth signal for "the mic is really recording", not the
     rec.start() call.
   - onend fires between phrases even in continuous mode. If the user hasn't
     explicitly stopped, we restart the recogniser automatically so continuous
     dictation actually feels continuous.
   - Errors get mapped to human-readable messages surfaced through the
     onError callback (and the returned `error` state) so the caller can
     show them.

   API:
     const { listening, supported, error, start, stop } = useDictation({
       onResult: (transcript) => setText(t => t + " " + transcript),
       onError: (msg) => flash(msg),
       lang: "en-ZA",
     });                                                                    */

interface SRResult { transcript: string; }
interface SRAlt extends ArrayLike<SRResult> { isFinal?: boolean; }
interface SREvent { results: ArrayLike<SRAlt>; resultIndex: number; }
interface SRErrorEvent { error?: string; message?: string; }
interface SRInstance {
  lang: string;
  interimResults: boolean;
  continuous?: boolean;
  onresult: (e: SREvent) => void;
  onstart: () => void;
  onaudiostart?: () => void;
  onspeechstart?: () => void;
  onspeechend?: () => void;
  onend: () => void;
  onerror: (e: SRErrorEvent) => void;
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

const ERR_MSG: Record<string, string> = {
  "not-allowed": "Microphone blocked. Click the lock icon in the address bar and allow microphone access.",
  "service-not-allowed": "Your browser's speech service isn't allowing this. Try Chrome or Edge, or check browser settings.",
  "no-speech": "No speech detected — try speaking a bit louder or closer to the mic.",
  "audio-capture": "Couldn't access the microphone. Is another app using it?",
  "network": "Speech recognition needs an internet connection — Chrome sends audio to Google's cloud.",
  "language-not-supported": "That language isn't supported by the speech recogniser.",
  "aborted": "",
};

export function useDictation({ onResult, onError, lang = "en-ZA", continuous = true }: {
  onResult: (transcript: string) => void;
  onError?: (message: string) => void;
  lang?: string;
  continuous?: boolean;
}) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SRInstance | null>(null);
  // Whether the user still wants the recogniser alive. Chrome's onend fires
  // between phrases in continuous mode; we restart while this flag is true.
  const wantOnRef = useRef(false);

  const raise = useCallback((msg: string) => {
    if (!msg) return;
    setError(msg);
    onError?.(msg);
  }, [onError]);

  const stop = useCallback(() => {
    wantOnRef.current = false;
    try { recRef.current?.stop(); } catch { /* ignore */ }
  }, []);

  const start = useCallback(() => {
    const SR = getSR();
    if (!SR) { raise("Dictation needs Chrome or Edge."); return; }
    // Guard against double-start; if a session is already active, do nothing.
    if (recRef.current) return;

    const rec = new SR();
    rec.lang = lang;
    // Chrome quirk: with continuous=true and interimResults=false, onresult
    // sometimes never fires. Enable interim, then filter to final ourselves.
    rec.interimResults = true;
    rec.continuous = continuous;

    rec.onresult = (ev) => {
      let chunk = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const alt = ev.results[i];
        if (alt && alt.isFinal && alt[0]?.transcript) {
          chunk += (chunk ? " " : "") + alt[0].transcript;
        }
      }
      const t = chunk.trim();
      if (t) onResult(t);
    };

    // Truth signal: the mic is actually recording. Only pulse the UI now.
    rec.onstart = () => { setListening(true); setError(null); };

    rec.onerror = (ev) => {
      const code = ev?.error || "unknown";
      // "aborted" happens on normal stop() — don't surface it.
      const msg = ERR_MSG[code] ?? `Dictation error: ${code}`;
      if (msg) raise(msg);
      // Hard errors should stop the restart loop.
      if (code === "not-allowed" || code === "service-not-allowed" || code === "audio-capture" || code === "network") {
        wantOnRef.current = false;
      }
      // For "no-speech" the restart loop keeps trying — that's usually what
      // the user wants when they pause between thoughts.
    };

    rec.onend = () => {
      // If the user hasn't stopped and we're in continuous mode, restart the
      // recogniser — Chrome ends between phrases and needs a nudge.
      if (wantOnRef.current && continuous) {
        try { rec.start(); return; } catch { /* fall through to stop */ }
      }
      setListening(false);
      recRef.current = null;
    };

    recRef.current = rec;
    wantOnRef.current = true;
    setError(null);
    try {
      rec.start();
    } catch (e) {
      // rec.start() throws synchronously if a session is already running, or
      // if the browser blocks it (e.g. no user gesture). Reset cleanly.
      wantOnRef.current = false;
      recRef.current = null;
      setListening(false);
      const m = e instanceof Error ? e.message : "Couldn't start dictation.";
      raise(m);
    }
  }, [onResult, raise, lang, continuous]);

  return { listening, supported: dictationSupported, error, start, stop };
}


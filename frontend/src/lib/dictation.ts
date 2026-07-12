import { useCallback, useRef, useState } from "react";
import { api } from "./api";

/* Reusable dictation hook — MediaRecorder + server-side Whisper edition.

   Third iteration. The first two used the browser's built-in SpeechRecognition
   (Web Speech API), which was a good fit for Chrome/Edge on any device but had
   two dealbreakers in the field:
   1. Brave blocks Google Cloud Speech-to-Text as a privacy stance, so users
      on Brave got a "network" error even though their internet was fine.
   2. Firefox and Safari have no SpeechRecognition support at all (Safari has
      an unfinished one gated behind flags).

   This version records raw audio in the browser using MediaRecorder (universal
   support since 2020), then POSTs the blob to /v1/transcribe on the VPS where
   OpenAI Whisper does the transcription. The frontend UX becomes:

     tap 🎤 → record → tap 🎙️ → wait (~2 seconds) → text appears.

   Slight UX shift from real-time streaming to batch, but reliability is much
   better and the same hook works in every browser.

   API stays close to the old useDictation shape so callers don't need to
   change much:

     const { listening, transcribing, supported, start, stop, transcribeFile, error } = useDictation({
       onResult: (transcript) => setText(t => t + " " + transcript),
       onError: (msg) => flash(msg),
     });

   Two new bits vs the Web Speech version:
   - `transcribing` — true while the backend is chewing on the audio blob.
     Callers can show a spinner instead of the button just going dead.
   - `transcribeFile(file)` — for uploading an existing audio file (backlog
     item #2 from the handover — "audio-file transcription, honestly deferred,
     never faked"). Now delivered.                                                 */

export const dictationSupported =
  typeof window !== "undefined" &&
  typeof navigator !== "undefined" &&
  !!navigator.mediaDevices?.getUserMedia &&
  typeof (window as unknown as { MediaRecorder?: unknown }).MediaRecorder !== "undefined";

/* Pick a mime type MediaRecorder actually supports on this browser. Chrome
   and Firefox prefer webm/opus; Safari lands on mp4/aac. If none of these
   report supported, we let the browser pick its default (empty string). */
function pickMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  for (const t of candidates) {
    try { if (MediaRecorder.isTypeSupported(t)) return t; } catch { /* older browsers throw */ }
  }
  return "";
}

function filenameFor(mime: string): string {
  if (mime.includes("webm")) return "dictation.webm";
  if (mime.includes("ogg")) return "dictation.ogg";
  if (mime.includes("mp4")) return "dictation.m4a";
  return "dictation.audio";
}

export function useDictation({ onResult, onError }: {
  onResult: (transcript: string) => void;
  onError?: (message: string) => void;
}) {
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeRef = useRef<string>("");

  const raise = useCallback((msg: string) => {
    if (!msg) return;
    setError(msg);
    onError?.(msg);
  }, [onError]);

  /* Send a Blob to the backend and route the transcript to the caller. Used
     by both live-record stop and by transcribeFile(). Any error is turned
     into a human message via onError. */
  const sendForTranscription = useCallback(async (blob: Blob, filename: string) => {
    if (blob.size === 0) { raise("No audio was captured — try again."); return; }
    setTranscribing(true);
    try {
      const { text } = await api.transcribe(blob, filename);
      const t = (text || "").trim();
      if (t) onResult(t);
      else raise("The transcription came back empty. Try speaking a bit longer.");
    } catch (e) {
      const m = e instanceof Error ? e.message : "Transcription failed.";
      // Route common backend errors to friendlier UI copy.
      if (m.includes("not configured") || m.includes("OPENAI_API_KEY")) {
        raise("Voice transcription isn't turned on for this server yet. Ask the admin to add OPENAI_API_KEY.");
      } else if (m.includes("too large")) {
        raise("That clip is over 25 MB — the transcription service can't take it. Try a shorter recording.");
      } else if (m.includes("Empty audio")) {
        raise("No audio was captured — try again.");
      } else {
        raise(`Couldn't transcribe: ${m}`);
      }
    } finally {
      setTranscribing(false);
    }
  }, [onResult, raise]);

  const cleanup = useCallback(() => {
    try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch { /* ignore */ }
    streamRef.current = null;
    recRef.current = null;
    chunksRef.current = [];
  }, []);

  const stop = useCallback(() => {
    const rec = recRef.current;
    if (!rec) { setListening(false); return; }
    try { rec.stop(); } catch { /* onstop still fires */ }
    setListening(false);
  }, []);

  const start = useCallback(async () => {
    if (!dictationSupported) { raise("Your browser doesn't support in-browser audio recording."); return; }
    if (listening || transcribing) return;

    setError(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      // Map the DOMException name to a user-friendly message. This is where
      // permission-denied, no-mic, etc. surface — much clearer than Web
      // Speech's cryptic error codes were.
      const name = (e as { name?: string })?.name || "";
      const map: Record<string, string> = {
        "NotAllowedError": "Microphone blocked. Click the lock icon in the address bar and allow microphone access.",
        "SecurityError": "Microphone blocked by browser security. The site needs HTTPS to record.",
        "NotFoundError": "No microphone detected on this device.",
        "NotReadableError": "Couldn't access the microphone — another app may be using it.",
        "OverconstrainedError": "The available microphones don't meet the requested constraints.",
        "AbortError": "Microphone access was cancelled.",
      };
      raise(map[name] || "Couldn't access the microphone.");
      return;
    }

    const mime = pickMime();
    mimeRef.current = mime;

    let rec: MediaRecorder;
    try {
      rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    } catch (e) {
      stream.getTracks().forEach((t) => t.stop());
      const m = e instanceof Error ? e.message : "Recorder failed to start.";
      raise(`Recorder failed to start: ${m}`);
      return;
    }

    chunksRef.current = [];
    rec.ondataavailable = (ev: BlobEvent) => {
      if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
    };
    rec.onstop = async () => {
      const chunks = chunksRef.current;
      const effectiveMime = mimeRef.current || (chunks[0]?.type ?? "audio/webm");
      const blob = new Blob(chunks, { type: effectiveMime });
      cleanup();
      await sendForTranscription(blob, filenameFor(effectiveMime));
    };
    rec.onerror = () => {
      raise("Recording error.");
      cleanup();
      setListening(false);
    };

    recRef.current = rec;
    streamRef.current = stream;
    try {
      rec.start();
      setListening(true);
    } catch (e) {
      cleanup();
      const m = e instanceof Error ? e.message : "Couldn't start recording.";
      raise(m);
    }
  }, [cleanup, listening, transcribing, raise, sendForTranscription]);

  /* Upload an existing audio file (e.g. a voice memo) and transcribe it. */
  const transcribeFile = useCallback(async (file: File) => {
    if (!file || file.size === 0) { raise("Empty file."); return; }
    if (!file.type.startsWith("audio/")) { raise("That doesn't look like an audio file."); return; }
    await sendForTranscription(file, file.name || "upload.audio");
  }, [raise, sendForTranscription]);

  return { listening, transcribing, supported: dictationSupported, error, start, stop, transcribeFile };
}

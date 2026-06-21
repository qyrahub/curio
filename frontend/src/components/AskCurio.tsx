import { useRef, useState } from "react";
import { api } from "../lib/api";
import { speak, stopSpeaking, speechSupported } from "../lib/speech";

type Turn = { who: "you" | "curio"; text: string; spoken?: string };

// Local, no-token handlers for the most common kid requests.
function localAnswer(q: string): { text: string; spoken: string } | null {
  const s = q.trim().toLowerCase();
  let m = s.match(/(?:spell|how do you spell|spell the word)\s+(?:the word\s+)?["']?([a-zA-Z][a-zA-Z'-]*)/);
  if (m) {
    const w = m[1].toUpperCase();
    return { text: `"${w}" is spelled:  ${w.split("").join(" - ")}`, spoken: `${w.split("").join(". ")}.` };
  }
  m = s.match(/count to (\d+)/);
  if (m) {
    const n = Math.min(parseInt(m[1], 10), 50);
    const nums = Array.from({ length: n }, (_, i) => i + 1).join(", ");
    return { text: nums, spoken: nums };
  }
  m = s.match(/what(?:'s| is)?\s+(\d+)\s*(plus|\+|minus|-|times|x|\*|multiplied by)\s*(\d+)/);
  if (m) {
    const a = +m[1], b = +m[3]; let r = a + b;
    if (/minus|-/.test(m[2])) r = a - b; else if (/times|x|\*|multiplied/.test(m[2])) r = a * b;
    return { text: `${a} ${m[2]} ${b} is ${r}.`, spoken: `${a} ${m[2]} ${b} is ${r}.` };
  }
  if (/^(hi|hello|hey|hiya)\b/.test(s)) return { text: "Hi there! Ask me to spell a word, count, or a question — tap the mic and just talk.", spoken: "Hi there! Ask me to spell a word, count, or a question. Tap the mic and just talk." };
  return null;
}

export default function AskCurio({ compact = false }: { compact?: boolean }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const lastSpoken = useRef("");
  const recRef = useRef<any>(null);

  const say = (text: string, spoken?: string, slow = false) => {
    const toSpeak = spoken ?? text;
    lastSpoken.current = toSpeak;
    speak(toSpeak, slow ? 0.6 : 0.95);
  };

  const submit = async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || busy) return;
    setInput("");
    const s = text.toLowerCase();
    // controls that act on the previous answer
    if (/slow(er)?|too fast/.test(s) && lastSpoken.current) { speak(lastSpoken.current, 0.55); return; }
    if (/(repeat|again|say that again)/.test(s) && lastSpoken.current) { speak(lastSpoken.current, 0.95); return; }

    setTurns((t) => [...t, { who: "you", text }]);
    const local = localAnswer(text);
    if (local) {
      setTurns((t) => [...t, { who: "curio", text: local.text, spoken: local.spoken }]);
      say(local.text, local.spoken);
      return;
    }
    setBusy(true);
    try {
      const r = await api.ask(text);
      setTurns((t) => [...t, { who: "curio", text: r.reply, spoken: r.reply }]);
      say(r.reply);
    } catch {
      const fb = "I'm not sure about that one yet — let's ask a grown-up together!";
      setTurns((t) => [...t, { who: "curio", text: fb }]);
      say(fb);
    } finally { setBusy(false); }
  };

  const mic = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Voice input isn't supported in this browser — try Chrome or Edge. You can still type!"); return; }
    if (listening) { recRef.current?.stop(); return; }
    const rec = new SR(); recRef.current = rec;
    rec.lang = "en-US"; rec.interimResults = false; rec.maxAlternatives = 1;
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.onresult = (e: any) => { const said = e.results[0][0].transcript; setInput(said); submit(said); };
    stopSpeaking(); rec.start();
  };

  return (
    <div className={"askcurio" + (compact ? " compact" : "")}>
      <div className="ask-head"><span className="ask-bot">🤖</span><b>Ask Curio</b><span className="muted">talk or type — try “spell whale”, then “slower”</span></div>
      {turns.length > 0 && (
        <div className="ask-log">
          {turns.slice(-6).map((t, i) => (
            <div key={i} className={"ask-bubble " + t.who}>
              <span>{t.text}</span>
              {t.who === "curio" && speechSupported && (
                <span className="ask-bubble-ctrl">
                  <button className="round-btn small" title="Read" onClick={() => say(t.text, t.spoken)}>🔊</button>
                  <button className="round-btn small" title="Slower" onClick={() => speak(t.spoken ?? t.text, 0.55)}>🐢</button>
                </span>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="ask-row">
        <button className={"ask-mic" + (listening ? " on" : "")} onClick={mic} title="Talk to Curio" aria-label="Talk to Curio">{listening ? "🔴" : "🎤"}</button>
        <input className="ask-in" value={input} placeholder={listening ? "Listening…" : "Ask me anything…"}
          onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); }} />
        <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => submit()}>{busy ? "…" : "Ask"}</button>
      </div>
    </div>
  );
}

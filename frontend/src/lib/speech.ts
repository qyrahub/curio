// Read-aloud using the browser's built-in Web Speech API.
// Fully on-device, free, and uses no API tokens.
export const speechSupported = typeof window !== "undefined" && "speechSynthesis" in window;

let preferred: SpeechSynthesisVoice | null = null;
function pickVoice(): SpeechSynthesisVoice | null {
  if (!speechSupported) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  if (preferred && voices.includes(preferred)) return preferred;
  // Prefer a US English female voice, then any US English, then any English.
  const usFemale = voices.filter((v) => v.lang.toLowerCase().startsWith("en-us") &&
    /female|samantha|zira|aria|jenny|allison|ava|susan|joanna|google us english/i.test(v.name));
  const us = voices.filter((v) => v.lang.toLowerCase().startsWith("en-us"));
  const enFemale = voices.filter((v) => v.lang.toLowerCase().startsWith("en") &&
    /female|samantha|zira|aria|jenny/i.test(v.name));
  const en = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
  preferred = usFemale[0] || us[0] || enFemale[0] || en[0] || voices[0];
  return preferred;
}
if (speechSupported) window.speechSynthesis.onvoiceschanged = () => { preferred = null; pickVoice(); };

export function speak(text: string, rate = 0.95): void {
  if (!speechSupported || !text) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const v = pickVoice();
  if (v) u.voice = v;
  u.lang = (v && v.lang) || "en-US";
  u.rate = rate;
  u.pitch = 1.0;
  window.speechSynthesis.speak(u);
}
export function stopSpeaking(): void {
  if (speechSupported) window.speechSynthesis.cancel();
}

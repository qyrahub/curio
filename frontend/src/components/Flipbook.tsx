import { useEffect, useState } from "react";
import type { Plan } from "../types";
import { speak, stopSpeaking, speechSupported } from "../lib/speech";

export default function Flipbook({ plan, apiBase }: { plan: Plan; apiBase: string }) {
  // index 0 = cover, 1..N = pages, N+1 = closing
  const [i, setI] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const total = plan.pages.length + 2;
  useEffect(() => { setShowAnswer(false); stopSpeaking(); }, [i]);
  useEffect(() => () => stopSpeaking(), []);

  const go = (d: number) => setI((v) => Math.min(total - 1, Math.max(0, v + d)));
  const isCover = i === 0;
  const isClosing = i === total - 1;
  const page = !isCover && !isClosing ? plan.pages[i - 1] : null;

  return (
    <div className="flip">
      <div className="flip-stage">
        <button className="flip-nav prev" onClick={() => go(-1)} disabled={i === 0} aria-label="Previous page">‹</button>

        <div className={"flip-page" + (isCover || isClosing ? " flip-cover" : "")} key={i}>
          {isCover && (
            <div className="flip-cover-in">
              <div className="flip-spark">★</div>
              <h2>Curio</h2>
              <p className="flip-sub">A learning adventure for age {plan.request.age}</p>
              <p className="flip-hint">Tap the arrows to flip through together →</p>
            </div>
          )}

          {isClosing && (
            <div className="flip-cover-in">
              <h2>The end ✨</h2>
              <p className="flip-sub">Great exploring! Come back tomorrow for a new adventure.</p>
            </div>
          )}

          {page && (() => {
            const emoji = page.anchor_visual.split("|")[0];
            return (
              <div className="flip-spread">
                <div className="flip-art">
                  <img className="anchor-img" src={`${apiBase}/plans/${plan.id}/pages/${page.order}/image`} alt={page.topic}
                    onError={(e) => { const el = e.currentTarget; el.style.display = "none"; (el.nextElementSibling as HTMLElement).style.display = ""; }} />
                  <span className="flip-emoji" style={{ display: "none" }}>{emoji || "✨"}</span>
                </div>
                <div className="flip-text">
                  <span className="badge-cat">{page.domain}</span>
                  <h3 className="topic">{page.topic}</h3>
                  <p className="guide">{page.guideline}</p>
                  <div className="flip-challenge">
                    <div className="flip-ch-head">
                      <b className="ch">Try this</b>
                      <div className="flip-icons">
                        {speechSupported && (
                          <button className="round-btn small" title="Read the challenge aloud"
                            onClick={() => speak(page.challenge)}>🔊</button>
                        )}
                        <button className="round-btn small" title="Show the answer"
                          onClick={() => setShowAnswer((s) => !s)}>💡</button>
                      </div>
                    </div>
                    <p className="flip-ch-text">{page.challenge}</p>
                    {showAnswer && (
                      <div className="flip-answer">
                        <div className="flip-ch-head">
                          <b className="ch ans">Answer</b>
                          {speechSupported && (
                            <button className="round-btn small" title="Read the answer aloud"
                              onClick={() => speak(page.answer || "Talk it through together.")}>🔊</button>
                          )}
                        </div>
                        <p className="flip-ch-text">{page.answer || "There's no single right answer — talk it through together."}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        <button className="flip-nav next" onClick={() => go(1)} disabled={i === total - 1} aria-label="Next page">›</button>
      </div>

      <div className="flip-foot">
        <span className="flip-count">{isCover ? "Cover" : isClosing ? "End" : `Page ${i} of ${plan.pages.length}`}</span>
        <div className="flip-dots">
          {Array.from({ length: total }).map((_, k) => (
            <button key={k} className={"flip-dot" + (k === i ? " on" : "")} onClick={() => setI(k)} aria-label={`Go to ${k}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

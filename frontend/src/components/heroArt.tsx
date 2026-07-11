import { useProfile, THEMES } from "../lib/profile";

/* Age-adaptive hero art.
   The old SectionArt only varied 4 of its kinds by age, and every other page fell
   back to a fixed illustration — so heroes never changed. This replaces it:

   - SEVEN maturity tiers, from the child's real age.
   - The visual REGISTER matures: chunky cartoon with faces and sparkles for the
     little ones -> clean illustration in the middle -> spare, geometric, editorial
     for teens and up. A 16-year-old should not be greeted by a cartoon caterpillar.
   - Art also picks up the focus child's THEME colour, so it changes per child too.
   - Pure SVG: crisp at any size, themeable, no assets, no network. */

export type Tier = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export function tierOf(age: number | null | undefined): Tier {
  if (age == null) return 4;            // no child yet: a neutral middle register
  if (age <= 4) return 1;               // playful
  if (age <= 6) return 2;
  if (age <= 8) return 3;
  if (age <= 10) return 4;
  if (age <= 12) return 5;
  if (age <= 15) return 6;              // teen: no whimsy
  return 7;                             // 16+: spare and adult
}

export const TIER_LABEL: Record<Tier, string> = {
  1: "≤4", 2: "5–6", 3: "7–8", 4: "9–10", 5: "11–12", 6: "13–15", 7: "16+",
};

/* Register knobs — everything downstream reads from these. */
interface Reg { round: number; stroke: number; whimsy: boolean; faces: boolean; fill: number; geo: boolean; }
const REG: Record<Tier, Reg> = {
  1: { round: 18, stroke: 0,   whimsy: true,  faces: true,  fill: 1,    geo: false },
  2: { round: 14, stroke: 0,   whimsy: true,  faces: true,  fill: 1,    geo: false },
  3: { round: 10, stroke: 1.5, whimsy: true,  faces: false, fill: .92,  geo: false },
  4: { round: 8,  stroke: 1.8, whimsy: false, faces: false, fill: .8,   geo: false },
  5: { round: 6,  stroke: 2,   whimsy: false, faces: false, fill: .6,   geo: false },
  6: { round: 3,  stroke: 2,   whimsy: false, faces: false, fill: .3,   geo: true  },
  7: { round: 1,  stroke: 1.8, whimsy: false, faces: false, fill: .16,  geo: true  },
};

const Sparkle = ({ x, y, s = 1, c }: { x: number; y: number; s?: number; c: string }) => (
  <path d={`M${x} ${y - 6 * s}L${x + 2 * s} ${y - 2 * s}L${x + 6 * s} ${y}L${x + 2 * s} ${y + 2 * s}L${x} ${y + 6 * s}L${x - 2 * s} ${y + 2 * s}L${x - 6 * s} ${y}L${x - 2 * s} ${y - 2 * s}Z`} fill={c} opacity=".85" />
);
const Face = ({ x, y, c }: { x: number; y: number; c: string }) => (
  <g stroke={c} strokeWidth="2" strokeLinecap="round" fill="none">
    <circle cx={x - 6} cy={y} r="1.6" fill={c} stroke="none" />
    <circle cx={x + 6} cy={y} r="1.6" fill={c} stroke="none" />
    <path d={`M${x - 5} ${y + 5}q5 4 10 0`} />
  </g>
);

/* Each kind draws its subject; the register decides how grown-up it looks. */
function motif(kind: string, r: Reg, a: string, d: string, ink: string) {
  const st = r.stroke ? { stroke: a, strokeWidth: r.stroke, fill: r.geo ? "none" : a, fillOpacity: r.fill } : { fill: a, fillOpacity: r.fill };

  switch (kind) {
    case "child":
      return (<>
        {/* growth: a sprout for the young, an ascending bar chart for the older */}
        {!r.geo ? (
          <>
            <rect x="112" y="118" width="36" height="10" rx={r.round / 2} fill={d} fillOpacity={r.fill} />
            <path d="M130 118V78" stroke={d} strokeWidth="4" strokeLinecap="round" />
            <ellipse cx="112" cy="86" rx="18" ry="11" {...st} transform="rotate(-18 112 86)" />
            <ellipse cx="150" cy="94" rx="15" ry="9" fill={d} fillOpacity={r.fill * .8} transform="rotate(16 150 94)" />
            {r.faces && <Face x={131} y={70} c={ink} />}
          </>
        ) : (
          <>
            {[0, 1, 2, 3].map((i) => (
              <rect key={i} x={96 + i * 20} y={126 - (i + 1) * 16} width="12" height={(i + 1) * 16} rx={r.round}
                fill={i === 3 ? a : d} fillOpacity={i === 3 ? .9 : r.fill} />
            ))}
            <path d="M92 128h84" stroke={ink} strokeWidth="1.2" opacity=".35" />
          </>
        )}
      </>);

    case "canvas":
      return (<>
        {!r.geo ? (
          <>
            <rect x="92" y="62" width="58" height="50" rx={r.round} {...st} />
            <circle cx="160" cy="98" r="20" fill={d} fillOpacity={r.fill} />
            <circle cx="154" cy="92" r="3.4" fill="#fff" opacity=".9" />
            <circle cx="166" cy="97" r="3.4" fill="#fff" opacity=".9" />
            <path d="M96 106q16-18 30 0t24-8" stroke={ink} strokeWidth="2.4" fill="none" strokeLinecap="round" opacity=".55" />
          </>
        ) : (
          <>
            <rect x="90" y="60" width="52" height="52" rx={r.round} fill="none" stroke={a} strokeWidth="2" />
            <rect x="112" y="82" width="52" height="52" rx={r.round} fill={d} fillOpacity={r.fill} />
            <path d="M150 70l18 18M168 70l-18 18" stroke={a} strokeWidth="1.6" strokeLinecap="round" opacity=".7" />
          </>
        )}
      </>);

    case "brain":
      return (<>
        {!r.geo ? (
          <>
            <path d="M108 62c-14 0-22 10-22 20 0 6 2 9 2 14s-4 8-4 14c0 12 12 18 24 18h4V62z" {...st} />
            <path d="M152 62c14 0 22 10 22 20 0 6-2 9-2 14s4 8 4 14c0 12-12 18-24 18h-4V62z" fill={d} fillOpacity={r.fill} />
            <path d="M130 62v66" stroke={ink} strokeWidth="2" opacity=".35" />
            {r.whimsy && <Sparkle x={168} y={58} s={1.4} c={a} />}
          </>
        ) : (
          <>
            {/* a node graph — thinking, not a cartoon brain */}
            <g stroke={a} strokeWidth="1.5" opacity=".8">
              <path d="M100 110L130 74M130 74L164 96M164 96L138 126M138 126L100 110M130 74L138 126" />
            </g>
            {[[100, 110], [130, 74], [164, 96], [138, 126]].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={i === 1 ? 8 : 5.5} fill={i === 1 ? a : d} fillOpacity={i === 1 ? .95 : .8} />
            ))}
          </>
        )}
      </>);

    case "coach":
      return (<>
        {!r.geo ? (
          <>
            <circle cx="130" cy="95" r="34" fill="none" stroke={a} strokeWidth="6" opacity=".35" />
            <circle cx="130" cy="95" r="20" fill="none" stroke={d} strokeWidth="6" opacity=".55" />
            <circle cx="130" cy="95" r="7" fill={a} />
            {r.whimsy && <Sparkle x={166} y={64} s={1.3} c={d} />}
          </>
        ) : (
          <>
            <path d="M96 126l22-30 20 16 26-42" stroke={a} strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="164" cy="70" r="4.5" fill={a} />
            <path d="M92 130h84" stroke={ink} strokeWidth="1.2" opacity=".3" />
          </>
        )}
      </>);

    case "family":
      return (<>
        {!r.geo ? (
          <>
            <circle cx="106" cy="82" r="14" {...st} />
            <circle cx="150" cy="78" r="17" fill={d} fillOpacity={r.fill} />
            <circle cx="128" cy="106" r="11" fill={a} fillOpacity={r.fill * .8} />
            <path d="M88 132q18-16 36 0M136 132q16-14 34 0" stroke={ink} strokeWidth="2.4" fill="none" strokeLinecap="round" opacity=".5" />
            {r.faces && <><Face x={106} y={82} c={ink} /><Face x={150} y={78} c={ink} /></>}
          </>
        ) : (
          <>
            {/* interlocking rings — connection without cartoons */}
            <circle cx="112" cy="94" r="26" fill="none" stroke={a} strokeWidth="2" />
            <circle cx="148" cy="94" r="26" fill="none" stroke={d} strokeWidth="2" />
            <circle cx="130" cy="112" r="26" fill="none" stroke={ink} strokeWidth="1.4" opacity=".4" />
          </>
        )}
      </>);

    case "parent":
      return (<>
        {!r.geo ? (
          <>
            <path d="M130 132c-24-16-38-28-38-44 0-11 9-18 19-18 8 0 14 4 19 11 5-7 11-11 19-11 10 0 19 7 19 18 0 16-14 28-38 44z" {...st} />
            {r.whimsy && <Sparkle x={172} y={66} s={1.3} c={d} />}
          </>
        ) : (
          <>
            <path d="M104 118V74M130 118V62M156 118V86" stroke={a} strokeWidth="3" strokeLinecap="round" />
            <path d="M96 128h68" stroke={ink} strokeWidth="1.2" opacity=".35" />
            <circle cx="130" cy="54" r="5" fill={d} />
          </>
        )}
      </>);

    case "learn":
      return (<>
        {!r.geo ? (
          <>
            <path d="M92 70h34c6 0 10 4 10 9v50c0-5-4-9-10-9H92z" {...st} />
            <path d="M168 70h-34c-6 0-10 4-10 9v50c0-5 4-9 10-9h34z" fill={d} fillOpacity={r.fill} />
            <path d="M130 79v50" stroke={ink} strokeWidth="2" opacity=".3" />
            {r.whimsy && <Sparkle x={166} y={58} s={1.2} c={a} />}
          </>
        ) : (
          <>
            <rect x="96" y="66" width="68" height="12" rx={r.round} fill={a} fillOpacity=".9" />
            <rect x="96" y="86" width="52" height="12" rx={r.round} fill={d} fillOpacity={r.fill} />
            <rect x="96" y="106" width="60" height="12" rx={r.round} fill={d} fillOpacity={r.fill * .7} />
            <circle cx="176" cy="72" r="4" fill={a} />
          </>
        )}
      </>);

    default: // home / account / anything else — a growth curve, matured by tier
      return (<>
        {!r.geo ? (
          <>
            <path d="M92 128q26 6 40-20t44-38" stroke={a} strokeWidth="5" fill="none" strokeLinecap="round" />
            <circle cx="176" cy="70" r={r.whimsy ? 10 : 7} fill={d} fillOpacity={r.fill} />
            {r.whimsy && <Sparkle x={104} y={72} s={1.3} c={d} />}
            {r.faces && <Face x={176} y={70} c="#fff" />}
          </>
        ) : (
          <>
            <path d="M92 128L114 108L136 116L158 84L180 70" stroke={a} strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            {[[114, 108], [136, 116], [158, 84], [180, 70]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3.4" fill={i === 3 ? a : d} />)}
            <path d="M92 132h92" stroke={ink} strokeWidth="1.2" opacity=".3" />
          </>
        )}
      </>);
  }
}

export function SectionArt({ kind }: { kind: string }) {
  const { activeChild, focusChild } = useProfile();
  const child = activeChild || focusChild;
  const tier = tierOf(child?.age);
  const r = REG[tier];

  // colours follow the child's theme, so the art changes per child as well as per age
  const t = child ? THEMES[child.theme] : null;
  const accent = t?.accent || "#FF7A66";
  const deep = t?.deep || "#F2563D";
  const tint = t?.t1 || "#FFF4E4";
  const ink = "#2C2A4A";

  return (
    <svg viewBox="0 0 260 180" role="img" aria-label={`${kind} illustration`}>
      {/* backdrop: a soft blob when young, a spare panel when grown */}
      <rect x="6" y="10" width="248" height="160" rx={r.geo ? 14 : 26} fill={tint} />
      {r.geo && <rect x="6" y="10" width="248" height="160" rx="14" fill="none" stroke={accent} strokeWidth="1" opacity=".35" />}
      {motif(kind, r, accent, deep, ink)}
    </svg>
  );
}

/* ---------------------------------------------------------------------------
   The Home preview card was hardcoded to a butterfly life-cycle — charming at 4,
   condescending at 16. It now matures with the child, content and art together. */

/** Art for the preview card — a text-free "wonder" illustration that matures
    with the child. Text-free by design so no hardcoded ink colour can ever go
    invisible in dark mode again (that was the old bug where "Claim" and
    "Evidence" vanished on the dark backdrop). The rotating daily content —
    topic tag, hook, small print, try-this / did-you-know body — lives in
    lib/wonderPool.ts and is consumed via useWonder() in Home.tsx. */
export function PreviewArt() {
  const { activeChild, focusChild } = useProfile();
  const child = activeChild || focusChild;
  const tier = tierOf(child?.age);
  const r = REG[tier];
  const t = child ? THEMES[child.theme] : null;
  const a = t?.accent || "#FF7A66";
  const d = t?.deep || "#F2563D";

  // Tier 1–2: friendly "wonder sun" — big smiley orb, rays, sparkles.
  if (tier <= 2) {
    return (
      <svg viewBox="0 0 260 180" role="img" aria-label="A wonder">
        {/* Rays */}
        {Array.from({ length: 8 }).map((_, i) => {
          const ang = (i * Math.PI * 2) / 8;
          const x1 = 130 + Math.cos(ang) * 48, y1 = 90 + Math.sin(ang) * 48;
          const x2 = 130 + Math.cos(ang) * 66, y2 = 90 + Math.sin(ang) * 66;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={a} strokeWidth="5" strokeLinecap="round" opacity=".55" />;
        })}
        {/* Orb */}
        <circle cx="130" cy="90" r="42" fill={a} />
        <circle cx="130" cy="90" r="42" fill={d} opacity=".18" />
        {r.faces && <Face x={130} y={86} c="#3B2A2A" />}
        {/* Sparkles */}
        <Sparkle x={54}  y={38}  s={1.1} c={d} />
        <Sparkle x={214} y={44}  s={0.9} c={d} />
        <Sparkle x={220} y={140} s={1}   c={a} />
        <Sparkle x={46}  y={140} s={0.9} c={a} />
      </svg>
    );
  }

  // Tier 3–4: stylised lightbulb with dotted rays.
  if (tier <= 4) {
    return (
      <svg viewBox="0 0 260 180" role="img" aria-label="A wonder">
        {/* Rays as dots — cleaner than lines at this age */}
        {Array.from({ length: 10 }).map((_, i) => {
          const ang = -Math.PI / 2 + (i - 4.5) * (Math.PI / 10);
          const dist = 62;
          return <circle key={i} cx={130 + Math.cos(ang) * dist} cy={78 + Math.sin(ang) * dist} r="2.4" fill={a} opacity=".7" />;
        })}
        {/* Bulb */}
        <path d="M130 42a34 34 0 0 1 22 60c-4 4-6 8-6 12v6h-32v-6c0-4-2-8-6-12a34 34 0 0 1 22-60z"
              fill={a} fillOpacity={r.fill * 0.35} stroke={a} strokeWidth={r.stroke} />
        {/* Filament — heart-ish for tier 3, cleaner spark for tier 4 */}
        {tier === 3
          ? <path d="M122 82c0-6 8-6 8 0c0-6 8-6 8 0c0 6-8 12-8 12s-8-6-8-12z" fill={d} />
          : <path d="M124 84l6-14 6 14-6-4z" fill={d} />}
        {/* Base */}
        <rect x="114" y="118" width="32" height="6"  rx="2" fill={d} opacity=".8" />
        <rect x="118" y="126" width="24" height="5"  rx="2" fill={d} opacity=".6" />
        <rect x="122" y="134" width="16" height="4"  rx="2" fill={d} opacity=".5" />
      </svg>
    );
  }

  // Tier 5: geometric spark — star at centre, dotted orbit, satellites.
  if (tier === 5) {
    return (
      <svg viewBox="0 0 260 180" role="img" aria-label="A wonder">
        {/* Orbit ring */}
        <ellipse cx="130" cy="90" rx="80" ry="46" fill="none" stroke={a} strokeWidth="1.2" strokeDasharray="3 5" opacity=".8" />
        {/* Central spark — 6-point star burst */}
        {Array.from({ length: 6 }).map((_, i) => {
          const ang = (i * Math.PI) / 3;
          return <line key={i} x1={130} y1={90} x2={130 + Math.cos(ang) * 22} y2={90 + Math.sin(ang) * 22}
                       stroke={d} strokeWidth="2.4" strokeLinecap="round" />;
        })}
        <circle cx="130" cy="90" r="6" fill={a} />
        {/* Satellites on the orbit */}
        {[[-1.1, 3.5], [0.3, 4], [1.8, 3]].map(([ang, sc], i) => (
          <circle key={i} cx={130 + Math.cos(ang) * 80} cy={90 + Math.sin(ang) * 46} r={sc} fill={d} />
        ))}
      </svg>
    );
  }

  // Tier 6–7: editorial constellation — 5 dots, thin connecting lines, one glowing.
  const pts = [[70, 70], [130, 44], [200, 80], [176, 132], [98, 128]];
  return (
    <svg viewBox="0 0 260 180" role="img" aria-label="A wonder">
      {pts.map((_, i) => {
        const [x1, y1] = pts[i]; const [x2, y2] = pts[(i + 1) % pts.length];
        return <line key={"l" + i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={a} strokeWidth="0.9" opacity=".7" />;
      })}
      {pts.map(([x, y], i) => (
        <g key={"p" + i}>
          {i === 1 && <circle cx={x} cy={y} r="10" fill={a} opacity=".22" />}
          <circle cx={x} cy={y} r={i === 1 ? 4 : 2.6} fill={i === 1 ? a : d} />
        </g>
      ))}
    </svg>
  );
}

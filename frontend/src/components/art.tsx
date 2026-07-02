import type { ReactNode } from "react";
import { isCurio } from "../lib/brand";
import { useProfile } from "../lib/profile";

// SVG art ported from curio_preview_v2.html (the look & feel Tom liked).
// SectionArt is age-aware: ≤4 keeps the original art; 5–7, 8–10 and 11+ get
// progressively more grown-up scenes, picked from the active/focused child's age.

export function BrandMark() {
  if (isCurio) return (
    <svg className="mark float" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M32 3c2 11 7 16 18 18-11 2-16 7-18 18-2-11-7-16-18-18 11-2 16-7 18-18Z"
        fill="#FFC94D" stroke="#F2563D" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="27" cy="30" r="2.4" fill="#2C2A4A" />
      <circle cx="37" cy="30" r="2.4" fill="#2C2A4A" />
      <path d="M27 36c2.5 2.5 7.5 2.5 10 0" stroke="#2C2A4A" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </svg>
  );
  return (
    <svg className="mark float" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M32 58V31" stroke="#3FA66E" strokeWidth="5" strokeLinecap="round" />
      <path d="M32 37C32 23 22 17 8 19c0 14 11 20 24 17Z" fill="#5BBF8A" stroke="#3FA66E" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M32 31C32 16 43 10 57 12c0 14-11 20-24 17Z" fill="#2EC4B6" stroke="#19A89C" strokeWidth="2.2" strokeLinejoin="round" />
    </svg>
  );
}

export function ButterflyLifecycle() {
  return (
    <svg viewBox="0 0 320 240" role="img"
      aria-label="A butterfly life cycle: egg, caterpillar, chrysalis and butterfly on a branch">
      <path d="M10 180 C 90 168, 200 196, 312 168" stroke="#9C6B3F" strokeWidth="9" fill="none" strokeLinecap="round" />
      <path d="M120 178 q 18 -22 44 -16" stroke="#9C6B3F" strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M52 176 q -22 -16 -4 -34 q 22 6 4 34Z" fill="#5BBF8A" />
      <path d="M250 170 q 24 -14 8 -34 q -24 8 -8 34Z" fill="#5BBF8A" />
      <ellipse cx="46" cy="168" rx="7" ry="9" fill="#FDE9A7" stroke="#E2B84B" strokeWidth="2" />
      <text x="46" y="200" fontSize="11" fontFamily="Fredoka" fill="#6A6680" textAnchor="middle">egg</text>
      <g>
        <circle cx="120" cy="164" r="8" fill="#7BC86A" /><circle cx="131" cy="166" r="8" fill="#6FBF5E" />
        <circle cx="142" cy="166" r="8" fill="#7BC86A" /><circle cx="153" cy="164" r="8" fill="#6FBF5E" />
        <circle cx="116" cy="162" r="1.6" fill="#2C2A4A" />
      </g>
      <text x="136" y="200" fontSize="11" fontFamily="Fredoka" fill="#6A6680" textAnchor="middle">caterpillar</text>
      <path d="M214 150 q 10 0 9 18 q -1 14 -9 20 q -8 -6 -9 -20 q -1 -18 9 -18Z" fill="#8FD0A8" stroke="#3F9E6B" strokeWidth="2" />
      <text x="214" y="200" fontSize="11" fontFamily="Fredoka" fill="#6A6680" textAnchor="middle">chrysalis</text>
      <g transform="translate(280,70)">
        <ellipse cx="0" cy="0" rx="3" ry="14" fill="#2C2A4A" />
        <path d="M0 -6 q -26 -22 -30 4 q -2 20 30 8Z" fill="#FF7A66" /><path d="M0 6 q -22 22 -28 -2 q 0 -16 28 -8Z" fill="#FFC94D" />
        <path d="M0 -6 q 26 -22 30 4 q 2 20 -30 8Z" fill="#FF7A66" /><path d="M0 6 q 22 22 28 -2 q 0 -16 -28 -8Z" fill="#FFC94D" />
        <line x1="0" y1="-12" x2="-6" y2="-22" stroke="#2C2A4A" strokeWidth="2" strokeLinecap="round" />
        <line x1="0" y1="-12" x2="6" y2="-22" stroke="#2C2A4A" strokeWidth="2" strokeLinecap="round" />
      </g>
      <text x="280" y="120" fontSize="11" fontFamily="Fredoka" fill="#6A6680" textAnchor="middle">butterfly</text>
    </svg>
  );
}

// Small friendly section scenes (brand palette) for each page's hero.
function Sparkle({ x, y, s = 1, c = "#FFC94D" }: { x: number; y: number; s?: number; c?: string }) {
  return <path transform={`translate(${x},${y}) scale(${s})`}
    d="M0 -9c.6 4 2 5.5 6 6-4 .6-5.4 2-6 6-.6-4-2-5.4-6-6 4-.6 5.4-2 6-6Z"
    fill={c} stroke="#F2563D" strokeWidth="0.8" />;
}

type Tier = "a" | "b" | "c" | "d"; // ≤4, 5–7, 8–10, 11+

const BG: Record<string, string> = {
  child: "#FFF4E4", parent: "#FFE9E4", family: "#EAF7F0", canvas: "#F3ECFF",
  brain: "#EAF6FF", coach: "#FFF4E4", account: "#FFF4E4", default: "#FFF4E4",
};

// ---- CHILD ----
function childScene(t: Tier): ReactNode {
  if (t === "a") return (<>
    <rect x="70" y="58" width="120" height="78" rx="10" fill="#fff" stroke="#F0E8DA" strokeWidth="2" />
    <rect x="70" y="58" width="60" height="78" rx="10" fill="#FFF0DC" />
    <line x1="130" y1="58" x2="130" y2="136" stroke="#F0E8DA" strokeWidth="2" />
    <rect x="84" y="74" width="32" height="6" rx="3" fill="#5BBF8A" />
    <rect x="84" y="88" width="32" height="6" rx="3" fill="#5AA7E6" />
    <rect x="144" y="74" width="32" height="6" rx="3" fill="#FF7A66" />
    <rect x="144" y="88" width="22" height="6" rx="3" fill="#9B6DD6" />
    <Sparkle x={56} y={56} s={1.4} /><Sparkle x={206} y={120} s={1.1} c="#5BBF8A" />
  </>);
  if (t === "b") return (<>
    <rect x="64" y="74" width="64" height="60" rx="6" fill="#FFF0DC" stroke="#F0E8DA" strokeWidth="2" />
    <rect x="132" y="74" width="64" height="60" rx="6" fill="#fff" stroke="#F0E8DA" strokeWidth="2" />
    <line x1="130" y1="74" x2="130" y2="134" stroke="#E2B84B" strokeWidth="3" />
    <circle cx="96" cy="96" r="11" fill="#FFC94D" />
    <path d="M84 114 q12 -8 24 0" stroke="#5BBF8A" strokeWidth="3" fill="none" strokeLinecap="round" />
    <rect x="144" y="86" width="40" height="5" rx="2.5" fill="#5AA7E6" />
    <rect x="144" y="98" width="40" height="5" rx="2.5" fill="#FF7A66" />
    <rect x="144" y="110" width="28" height="5" rx="2.5" fill="#9B6DD6" />
    <Sparkle x={204} y={70} s={1.1} /><Sparkle x={56} y={120} s={1} c="#5BBF8A" />
  </>);
  if (t === "c") return (<>
    <rect x="58" y="70" width="70" height="64" rx="6" fill="#fff" stroke="#F0E8DA" strokeWidth="2" />
    <rect x="132" y="70" width="70" height="64" rx="6" fill="#fff" stroke="#F0E8DA" strokeWidth="2" />
    <line x1="130" y1="70" x2="130" y2="134" stroke="#E2B84B" strokeWidth="3" />
    {[80, 90, 100, 110].map((y) => <rect key={"l" + y} x="66" y={y} width="54" height="4" rx="2" fill="#E7DECC" />)}
    {[80, 90, 100, 110].map((y) => <rect key={"r" + y} x="140" y={y} width="54" height="4" rx="2" fill="#E7DECC" />)}
    <rect x="66" y="80" width="40" height="4" rx="2" fill="#5AA7E6" />
    <path d="M150 70 v18 l6 -5 l6 5 v-18Z" fill="#FF7A66" />
    <rect x="150" y="120" width="48" height="7" rx="3" transform="rotate(-12 174 123)" fill="#FFC94D" />
    <Sparkle x={206} y={66} s={1.2} />
  </>);
  return (<>
    <rect x="74" y="58" width="112" height="80" rx="10" fill="#2C2A4A" />
    <rect x="80" y="64" width="100" height="68" rx="6" fill="#fff" />
    <rect x="88" y="72" width="46" height="6" rx="3" fill="#5AA7E6" />
    {[86, 94, 102].map((y) => <rect key={y} x="88" y={y} width="64" height="4" rx="2" fill="#E7DECC" />)}
    <rect x="90" y="116" width="8" height="10" rx="2" fill="#FF7A66" />
    <rect x="102" y="110" width="8" height="16" rx="2" fill="#5BBF8A" />
    <rect x="114" y="118" width="8" height="8" rx="2" fill="#FFC94D" />
    <rect x="126" y="106" width="8" height="20" rx="2" fill="#9B6DD6" />
    <rect x="150" y="96" width="40" height="6" rx="3" transform="rotate(40 170 99)" fill="#9C6B3F" />
    <Sparkle x={196} y={62} s={1.1} />
  </>);
}

// ---- CANVAS ----
function canvasScene(t: Tier): ReactNode {
  if (t === "a") return (<>
    <ellipse cx="118" cy="100" rx="44" ry="36" fill="#fff" stroke="#F0E8DA" strokeWidth="2" />
    <circle cx="100" cy="84" r="7" fill="#FF7A66" /><circle cx="124" cy="78" r="7" fill="#FFC94D" />
    <circle cx="140" cy="94" r="7" fill="#5BBF8A" /><circle cx="104" cy="112" r="7" fill="#5AA7E6" />
    <circle cx="118" cy="104" r="11" fill="#FFF4E4" stroke="#F0E8DA" strokeWidth="2" />
    <rect x="150" y="60" width="8" height="60" rx="4" transform="rotate(28 154 90)" fill="#9C6B3F" />
    <path d="M168 64l10 6-6 10Z" fill="#9B6DD6" />
    <Sparkle x={70} y={64} s={1.2} />
  </>);
  if (t === "b") return (<>
    <rect x="70" y="64" width="56" height="56" rx="6" fill="#fff" stroke="#F0E8DA" strokeWidth="2" />
    <circle cx="86" cy="84" r="8" fill="#FF7A66" />
    <rect x="98" y="92" width="18" height="18" rx="3" fill="#5AA7E6" />
    <path d="M76 112 q12 -14 24 0" stroke="#5BBF8A" strokeWidth="3" fill="none" />
    <ellipse cx="160" cy="100" rx="30" ry="24" fill="#fff" stroke="#F0E8DA" strokeWidth="2" />
    <circle cx="150" cy="92" r="5" fill="#FF7A66" /><circle cx="166" cy="88" r="5" fill="#FFC94D" />
    <circle cx="174" cy="100" r="5" fill="#5BBF8A" /><circle cx="154" cy="106" r="5" fill="#5AA7E6" />
    <circle cx="160" cy="100" r="7" fill="#F3ECFF" stroke="#F0E8DA" strokeWidth="2" />
    <Sparkle x={70} y={58} s={1.1} />
  </>);
  if (t === "c") return (<>
    <line x1="100" y1="60" x2="80" y2="140" stroke="#9C6B3F" strokeWidth="5" strokeLinecap="round" />
    <line x1="160" y1="60" x2="180" y2="140" stroke="#9C6B3F" strokeWidth="5" strokeLinecap="round" />
    <line x1="92" y1="120" x2="168" y2="120" stroke="#9C6B3F" strokeWidth="4" />
    <rect x="92" y="56" width="76" height="64" rx="4" fill="#fff" stroke="#F0E8DA" strokeWidth="2" />
    <circle cx="116" cy="80" r="10" fill="#FFC94D" />
    <path d="M104 104 q20 -22 44 0" stroke="#5BBF8A" strokeWidth="4" fill="none" />
    <rect x="128" y="86" width="22" height="16" rx="3" fill="#FF7A66" />
    <Sparkle x={196} y={64} s={1.2} />
  </>);
  return (<>
    <rect x="78" y="58" width="104" height="78" rx="10" fill="#2C2A4A" />
    <rect x="84" y="64" width="92" height="66" rx="6" fill="#F7F3FF" />
    <path d="M100 110 L120 78 L150 100" fill="none" stroke="#9B6DD6" strokeWidth="3" strokeLinejoin="round" />
    <circle cx="100" cy="110" r="4" fill="#FF7A66" /><circle cx="120" cy="78" r="4" fill="#FF7A66" /><circle cx="150" cy="100" r="4" fill="#FF7A66" />
    <rect x="126" y="104" width="22" height="18" rx="3" fill="#5AA7E6" opacity="0.8" />
    <rect x="150" y="92" width="44" height="6" rx="3" transform="rotate(42 172 95)" fill="#FFC94D" />
    <Sparkle x={70} y={62} s={1.1} />
  </>);
}

// ---- BRAIN ----
function brainScene(t: Tier): ReactNode {
  if (t === "a") return (<>
    <path d="M104 76c-14 0-22 12-16 24-8 8-2 24 12 24 4 8 18 10 26 2 10 6 24-2 22-14 10-6 8-22-4-26 0-12-14-18-24-12-4-4-12-4-16 2Z"
      fill="#EAF6FF" stroke="#5AA7E6" strokeWidth="2.5" />
    <circle cx="118" cy="100" r="4" fill="#2EC4B6" /><circle cx="140" cy="92" r="4" fill="#FF7A66" /><circle cx="132" cy="116" r="4" fill="#9B6DD6" />
    <line x1="118" y1="100" x2="140" y2="92" stroke="#2C2A4A" strokeWidth="1.2" /><line x1="140" y1="92" x2="132" y2="116" stroke="#2C2A4A" strokeWidth="1.2" />
    <Sparkle x={184} y={62} s={1.3} c="#2EC4B6" /><Sparkle x={70} y={120} s={1} />
  </>);
  if (t === "b") return (<>
    <path d="M104 76c-14 0-22 12-16 24-8 8-2 24 12 24 4 8 18 10 26 2 10 6 24-2 22-14 10-6 8-22-4-26 0-12-14-18-24-12-4-4-12-4-16 2Z"
      fill="#EAF6FF" stroke="#5AA7E6" strokeWidth="2.5" />
    <path d="M112 98 L134 90 L148 106 M134 90 L128 114" stroke="#2C2A4A" strokeWidth="1.2" fill="none" />
    <circle cx="112" cy="98" r="4" fill="#2EC4B6" /><circle cx="134" cy="90" r="4" fill="#FF7A66" /><circle cx="128" cy="114" r="4" fill="#9B6DD6" /><circle cx="148" cy="106" r="4" fill="#FFC94D" />
    <Sparkle x={186} y={62} s={1.3} c="#2EC4B6" /><Sparkle x={70} y={120} s={1} />
  </>);
  if (t === "c") return (<>
    <rect x="68" y="56" width="124" height="84" rx="12" fill="#fff" stroke="#F0E8DA" strokeWidth="2" />
    <path d="M92 80 L140 98 M150 72 L140 98 M170 104 L140 98 M120 120 L140 98 M100 108 L140 98" stroke="#CFE0F0" strokeWidth="2" />
    <circle cx="140" cy="98" r="7" fill="#5AA7E6" />
    <circle cx="92" cy="80" r="5" fill="#2EC4B6" /><circle cx="150" cy="72" r="5" fill="#FF7A66" /><circle cx="170" cy="104" r="5" fill="#9B6DD6" /><circle cx="120" cy="120" r="5" fill="#FFC94D" /><circle cx="100" cy="108" r="5" fill="#5BBF8A" />
    <Sparkle x={184} y={62} s={1.1} />
  </>);
  const L1 = [[92, 80], [92, 98], [92, 116]], L2 = [[130, 72], [130, 90], [130, 108], [130, 126]], L3 = [[168, 90], [168, 108]];
  const edges: number[][][] = [];
  L1.forEach((a) => L2.forEach((b) => edges.push([a, b])));
  L2.forEach((a) => L3.forEach((b) => edges.push([a, b])));
  return (<>
    <rect x="66" y="56" width="128" height="84" rx="12" fill="#fff" stroke="#F0E8DA" strokeWidth="2" />
    {edges.map((e, i) => <line key={i} x1={e[0][0]} y1={e[0][1]} x2={e[1][0]} y2={e[1][1]} stroke="#E3EDF7" strokeWidth="1.4" />)}
    {L1.map((p, i) => <circle key={"a" + i} cx={p[0]} cy={p[1]} r="5" fill="#2EC4B6" />)}
    {L2.map((p, i) => <circle key={"b" + i} cx={p[0]} cy={p[1]} r="5" fill="#5AA7E6" />)}
    {L3.map((p, i) => <circle key={"c" + i} cx={p[0]} cy={p[1]} r="5" fill="#9B6DD6" />)}
    <Sparkle x={186} y={62} s={1.1} />
  </>);
}

// ---- COACH ----
function coachScene(t: Tier): ReactNode {
  if (t === "a") return (<>
    <rect x="92" y="46" width="76" height="92" rx="10" fill="#fff" stroke="#F0E8DA" strokeWidth="2" />
    <rect x="116" y="38" width="28" height="14" rx="5" fill="#FF7A66" />
    <circle cx="108" cy="70" r="5" fill="#5BBF8A" /><rect x="120" y="66" width="36" height="6" rx="3" fill="#E7DECC" />
    <circle cx="108" cy="92" r="5" fill="#5AA7E6" /><rect x="120" y="88" width="36" height="6" rx="3" fill="#E7DECC" />
    <circle cx="108" cy="114" r="5" fill="#9B6DD6" /><rect x="120" y="110" width="28" height="6" rx="3" fill="#E7DECC" />
    <path d="M104 70l3 3 5-6" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <Sparkle x={196} y={56} s={1.3} /><Sparkle x={66} y={120} s={1} c="#5BBF8A" />
  </>);
  if (t === "b") return (<>
    <rect x="92" y="46" width="76" height="92" rx="10" fill="#fff" stroke="#F0E8DA" strokeWidth="2" />
    <rect x="116" y="38" width="28" height="14" rx="5" fill="#FF7A66" />
    {[68, 86, 104].map((y) => (<g key={y}><circle cx="108" cy={y} r="5" fill="#5BBF8A" /><path d={`M104 ${y}l3 3 5-6`} stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /><rect x="120" y={y - 4} width="36" height="6" rx="3" fill="#E7DECC" /></g>))}
    <rect x="104" y="120" width="52" height="7" rx="3.5" fill="#EFE7D8" />
    <rect x="104" y="120" width="34" height="7" rx="3.5" fill="#5BBF8A" />
    <Sparkle x={196} y={56} s={1.2} />
  </>);
  if (t === "c") return (<>
    <rect x="84" y="50" width="92" height="92" rx="10" fill="#fff" stroke="#F0E8DA" strokeWidth="2" />
    <rect x="116" y="42" width="28" height="14" rx="5" fill="#FF7A66" />
    <circle cx="100" cy="70" r="5" fill="#5BBF8A" /><path d="M97 70l2 2 4-4" stroke="#fff" strokeWidth="2" fill="none" /><rect x="112" y="66" width="48" height="6" rx="3" fill="#E7DECC" />
    <circle cx="100" cy="86" r="5" fill="#5BBF8A" /><path d="M97 86l2 2 4-4" stroke="#fff" strokeWidth="2" fill="none" /><rect x="112" y="82" width="40" height="6" rx="3" fill="#E7DECC" />
    <rect x="100" y="116" width="10" height="12" rx="2" fill="#5AA7E6" />
    <rect x="116" y="108" width="10" height="20" rx="2" fill="#9B6DD6" />
    <rect x="132" y="112" width="10" height="16" rx="2" fill="#FFC94D" />
    <rect x="148" y="104" width="10" height="24" rx="2" fill="#5BBF8A" />
    <Sparkle x={196} y={56} s={1.2} />
  </>);
  return (<>
    <rect x="74" y="54" width="112" height="84" rx="10" fill="#fff" stroke="#F0E8DA" strokeWidth="2" />
    <rect x="84" y="64" width="40" height="6" rx="3" fill="#9B6DD6" />
    <polyline points="86,110 100,100 114,106 128,88 142,94 156,78" fill="none" stroke="#5AA7E6" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
    <circle cx="88" cy="124" r="3" fill="#FF7A66" /><rect x="96" y="121" width="60" height="5" rx="2.5" fill="#E7DECC" />
    <circle cx="88" cy="134" r="3" fill="#5BBF8A" /><rect x="96" y="131" width="48" height="5" rx="2.5" fill="#E7DECC" />
    <Sparkle x={196} y={58} s={1.2} />
  </>);
}

const STATIC: Record<string, ReactNode> = {
  parent: (<>
    <circle cx="108" cy="74" r="20" fill="#FF7A66" /><rect x="86" y="96" width="44" height="44" rx="16" fill="#FF7A66" />
    <circle cx="150" cy="92" r="13" fill="#5AA7E6" /><rect x="137" y="106" width="26" height="32" rx="11" fill="#5AA7E6" />
    <path d="M120 128c8 8 20 8 28 0" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
    <Sparkle x={196} y={58} s={1.2} /><Sparkle x={64} y={120} s={1} c="#9B6DD6" />
  </>),
  family: (<>
    <rect x="92" y="86" width="76" height="56" rx="8" fill="#fff" stroke="#F0E8DA" strokeWidth="2" />
    <path d="M86 88 L130 56 L174 88 Z" fill="#FF7A66" />
    <rect x="120" y="110" width="20" height="32" rx="4" fill="#5AA7E6" />
    <path d="M130 96c-6-7-16-2-12 5 2 4 12 9 12 9s10-5 12-9c4-7-6-12-12-5Z" fill="#F2563D" />
    <circle cx="206" cy="60" r="14" fill="#FFC94D" />
    <Sparkle x={64} y={64} s={1.1} c="#5BBF8A" />
  </>),
  account: (<>
    <circle cx="118" cy="92" r="26" fill="none" stroke="#FFC94D" strokeWidth="9" />
    <rect x="138" y="86" width="60" height="12" rx="6" fill="#FFC94D" />
    <rect x="178" y="86" width="10" height="22" rx="4" fill="#FFC94D" />
    <rect x="160" y="86" width="9" height="18" rx="4" fill="#FFC94D" />
    <circle cx="118" cy="92" r="8" fill="#FFF4E4" />
    <Sparkle x={196} y={120} s={1.2} c="#FF7A66" /><Sparkle x={70} y={62} s={1.1} />
  </>),
  default: (<Sparkle x={130} y={90} s={2} />),
};

export function SectionArt({ kind }: { kind: string }) {
  const { activeChild, focusChild } = useProfile();
  const age = (activeChild || focusChild)?.age;
  const tier: Tier = age == null ? "a" : age <= 4 ? "a" : age <= 7 ? "b" : age <= 10 ? "c" : "d";
  let children: ReactNode;
  switch (kind) {
    case "child": children = childScene(tier); break;
    case "canvas": children = canvasScene(tier); break;
    case "brain": children = brainScene(tier); break;
    case "coach": children = coachScene(tier); break;
    default: children = STATIC[kind] || STATIC.default; break;
  }
  const bg = BG[kind] || BG.default;
  return (
    <svg viewBox="0 0 260 180" role="img" aria-label={`${kind} illustration`}>
      <rect x="6" y="10" width="248" height="160" rx="26" fill={bg} />
      {children}
    </svg>
  );
}

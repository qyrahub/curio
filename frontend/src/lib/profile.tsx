import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

/* Curio · profile context — the spine of per-child personalisation.
   - mode: "parent" (sees everything, per-child sections) or "child" (the whole
     site is scoped + age-appropriate for one child, and re-skinned to their theme).
   - activeChild: the child the SITE is currently "wearing" (child mode only).
   - focusChild: in PARENT mode, the child a per-child section is looking at,
     without flipping the whole site into child mode.
   - ageBand: derived from the relevant child's age so every module can filter
     content to an age range.
   Self-contained + client-persisted for now; swap load/save for API calls when
   the backend stores profiles. */

export type ThemeKey = "sunrise" | "ocean" | "sky" | "meadow" | "grape" | "sunshine" | "blossom"
  | "rose" | "bubblegum" | "lavender" | "plum" | "periwinkle" | "cobalt" | "aqua" | "mint" | "sage"
  | "forest" | "lemon" | "apricot" | "sunset" | "berry" | "slate";
export type Mode = "child" | "parent" | "admin";

export interface ChildProfile {
  id: string; name: string; age: number;
  gender: "girl" | "boy" | "other"; theme: ThemeKey; interests: string[];
  displayMode?: "light" | "dark" | "system";
}
export interface AgeBand { min: number; max: number; label: string; }

export const THEMES: Record<ThemeKey, { name: string; accent: string; deep: string; t1: string; t2: string; emoji: string }> = {
  sunrise:  { name: "Sunrise",  accent: "#FF7A66", deep: "#F2563D", t1: "#FFF1EC", t2: "#FFE3D9", emoji: "🦊" },
  ocean:    { name: "Ocean",    accent: "#2EC4B6", deep: "#1E9B8F", t1: "#E7F8F5", t2: "#CFEFEA", emoji: "🐬" },
  sky:      { name: "Sky",      accent: "#5AA7E6", deep: "#3F7FBE", t1: "#EAF4FD", t2: "#D6E9FB", emoji: "🚀" },
  meadow:   { name: "Meadow",   accent: "#5BBF8A", deep: "#3E9E6C", t1: "#EAF7F0", t2: "#D4EEDF", emoji: "🐢" },
  grape:    { name: "Grape",    accent: "#9B6DD6", deep: "#7A4FB5", t1: "#F2EBFA", t2: "#E6D9F6", emoji: "🦄" },
  sunshine: { name: "Sunshine", accent: "#FFB02E", deep: "#E08A00", t1: "#FFF6E2", t2: "#FFEBBE", emoji: "🐝" },
  blossom:  { name: "Blossom",  accent: "#FF7AA8", deep: "#E85C8E", t1: "#FFEDF4", t2: "#FFD9E8", emoji: "🌸" },
  rose:     { name: "Rose",     accent: "#FF6F91", deep: "#E84B73", t1: "#FFEDF1", t2: "#FFD7E2", emoji: "🌷" },
  bubblegum:{ name: "Bubblegum",accent: "#FF8FC7", deep: "#F265AC", t1: "#FFEDF6", t2: "#FFD6EC", emoji: "🍬" },
  lavender: { name: "Lavender", accent: "#B79CED", deep: "#9B7DE0", t1: "#F3EEFD", t2: "#E7DBF9", emoji: "💜" },
  plum:     { name: "Plum",     accent: "#8E5BB8", deep: "#6E3F96", t1: "#F1EAF7", t2: "#E2D3F0", emoji: "🍇" },
  periwinkle:{name: "Periwinkle",accent:"#8FA3F0", deep: "#6B82E0", t1: "#EEF1FF", t2: "#DCE2FB", emoji: "🦋" },
  cobalt:   { name: "Cobalt",   accent: "#5C77F0", deep: "#3F57D6", t1: "#EBEEFF", t2: "#D7DEFF", emoji: "🔵" },
  aqua:     { name: "Aqua",     accent: "#4FC3D9", deep: "#2AA3BC", t1: "#E6F8FB", t2: "#CDEFF5", emoji: "🐳" },
  mint:     { name: "Mint",     accent: "#6FD6A8", deep: "#46B584", t1: "#E8FAF1", t2: "#CFF1E1", emoji: "🌿" },
  sage:     { name: "Sage",     accent: "#93C49B", deep: "#6FA77A", t1: "#EEF6EF", t2: "#D9ECDC", emoji: "🍃" },
  forest:   { name: "Forest",   accent: "#4FA06A", deep: "#357A4D", t1: "#E9F4ED", t2: "#CFE7D7", emoji: "🌲" },
  lemon:    { name: "Lemon",    accent: "#FFD43B", deep: "#E5B400", t1: "#FFFAE0", t2: "#FFF1B8", emoji: "🍋" },
  apricot:  { name: "Apricot",  accent: "#FFA579", deep: "#F2854F", t1: "#FFF0E8", t2: "#FFDFCD", emoji: "🍑" },
  sunset:   { name: "Sunset",   accent: "#FF8A5B", deep: "#F2613C", t1: "#FFF0E9", t2: "#FFDCCD", emoji: "🌅" },
  berry:    { name: "Berry",    accent: "#E0529E", deep: "#C23A82", t1: "#FCE9F3", t2: "#F7D2E6", emoji: "🫐" },
  slate:    { name: "Slate",    accent: "#6B7A99", deep: "#4E5C78", t1: "#EEF1F6", t2: "#DCE2EC", emoji: "🌙" },
};
const DEFAULT_CORAL = "#FF7A66", DEFAULT_CORAL_DEEP = "#F2563D";

export function ageBand(age: number): AgeBand {
  if (age <= 4) return { min: 3, max: 4, label: "3–4" };
  if (age <= 6) return { min: 5, max: 6, label: "5–6" };
  if (age <= 8) return { min: 7, max: 8, label: "7–8" };
  if (age <= 10) return { min: 9, max: 10, label: "9–10" };
  if (age <= 12) return { min: 11, max: 12, label: "11–12" };
  return { min: 13, max: 99, label: "13+" };
}

interface ProfileCtx {
  mode: Mode;
  children: ChildProfile[];
  activeChild: ChildProfile | null;     // child mode: the whole site is scoped to this child
  focusChild: ChildProfile | null;      // parent mode: which child a per-child section shows
  ageBand: AgeBand | null;              // band of activeChild (child mode) or focusChild (parent mode)
  theme: ThemeKey | null;
  displayMode: "light" | "dark";          // resolved current display (system → actual)
  parentDisplay: "light" | "dark" | "system";
  setParentDisplay: (m: "light" | "dark" | "system") => void;
  parentTheme: ThemeKey | null;
  setParentTheme: (t: ThemeKey) => void;
  switchToChild: (id: string) => void;
  switchToParent: () => void;
  switchToAdmin: () => void;
  setFocusChild: (id: string) => void;
  addChild: () => ChildProfile;
  updateChild: (c: ChildProfile) => void;
  removeChild: (id: string) => void;
}
const Ctx = createContext<ProfileCtx | null>(null);

export function useProfile(): ProfileCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useProfile must be used inside <ProfileProvider>");
  return c;
}

interface Persist { mode: Mode; activeChildId: string | null; focusChildId: string | null; children: ChildProfile[]; parentDisplay?: "light" | "dark" | "system"; parentTheme?: ThemeKey; }
const KEY = "curio.profiles.v1";
function seed(): Persist {
  return {
    mode: "parent", activeChildId: "sunshine", focusChildId: "sunshine",
    children: [
      { id: "sunshine", name: "Sunshine", age: 6, gender: "girl", theme: "sunshine", interests: ["Animals", "Space", "Counting"] },
      { id: "sage", name: "Sage", age: 9, gender: "boy", theme: "sage", interests: ["Building", "Comics", "Dinosaurs"] },
    ],
  };
}
function load(): Persist {
  try { const r = localStorage.getItem(KEY); if (r) return { ...seed(), ...JSON.parse(r) as Persist }; } catch { /* fall through */ }
  return seed();
}

export function ProfileProvider({ children: tree }: { children: ReactNode }) {
  const [st, setSt] = useState<Persist>(load);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch { /* ignore */ } }, [st]);

  const byId = (id: string | null) => (id ? st.children.find((c) => c.id === id) || null : null);
  const activeChild = st.mode === "child" ? (byId(st.activeChildId) || st.children[0] || null) : null;
  const focusChild = byId(st.focusChildId) || st.children[0] || null;
  const themeChild = activeChild || null;

  // whole-site re-skin: override Curio's primary accent tokens for the active child (or admin).
  useEffect(() => {
    const root = document.documentElement.style;
    const ADMIN = { a: "#6366F1", d: "#4F46E5", t1: "#EEF0FF", t2: "#E0E3FF" };
    if (st.mode === "admin") {
      root.setProperty("--coral", ADMIN.a); root.setProperty("--coral-deep", ADMIN.d);
      root.setProperty("--accent", ADMIN.a); root.setProperty("--accent-deep", ADMIN.d);
      root.setProperty("--tint1", ADMIN.t1); root.setProperty("--tint2", ADMIN.t2);
    } else if (themeChild) {
      const t = THEMES[themeChild.theme];
      root.setProperty("--coral", t.accent); root.setProperty("--coral-deep", t.deep);
      root.setProperty("--accent", t.accent); root.setProperty("--accent-deep", t.deep);
      root.setProperty("--tint1", t.t1); root.setProperty("--tint2", t.t2);
    } else {
      const pk = st.parentTheme && THEMES[st.parentTheme] ? st.parentTheme : null;
      if (pk) {
        const t = THEMES[pk];
        root.setProperty("--coral", t.accent); root.setProperty("--coral-deep", t.deep);
        root.setProperty("--accent", t.accent); root.setProperty("--accent-deep", t.deep);
        root.setProperty("--tint1", t.t1); root.setProperty("--tint2", t.t2);
      } else {
        root.setProperty("--coral", DEFAULT_CORAL); root.setProperty("--coral-deep", DEFAULT_CORAL_DEEP);
        root.setProperty("--accent", DEFAULT_CORAL); root.setProperty("--accent-deep", DEFAULT_CORAL_DEEP);
        root.setProperty("--tint1", "#FFF1EC"); root.setProperty("--tint2", "#FFE3D9");
      }
    }
  }, [st.mode, themeChild ? themeChild.id : null, themeChild ? themeChild.theme : null, st.parentTheme]);

  // light/dark/system mode → data-mode on <html>. Admin is forced light.
  const rawMode: "light" | "dark" | "system" =
    st.mode === "admin" ? "light"
      : st.mode === "child" ? (activeChild?.displayMode || "system")
        : (st.parentDisplay || "system");
  const sysDark = () => typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolvedMode: "light" | "dark" = rawMode === "system" ? (sysDark() ? "dark" : "light") : rawMode;
  useEffect(() => {
    const apply = () => {
      const r = rawMode === "system" ? (sysDark() ? "dark" : "light") : rawMode;
      document.documentElement.dataset.mode = r;
    };
    apply();
    if (rawMode === "system" && typeof window !== "undefined" && window.matchMedia) {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const fn = () => apply();
      mq.addEventListener?.("change", fn);
      return () => mq.removeEventListener?.("change", fn);
    }
  }, [rawMode]);

  const refChild = activeChild || focusChild;
  const value: ProfileCtx = {
    mode: st.mode,
    children: st.children,
    activeChild,
    focusChild,
    ageBand: refChild ? ageBand(refChild.age) : null,
    theme: themeChild ? themeChild.theme : null,
    displayMode: resolvedMode,
    parentDisplay: st.parentDisplay || "system",
    setParentDisplay: (m) => setSt((s) => ({ ...s, parentDisplay: m })),
    parentTheme: st.parentTheme || null,
    setParentTheme: (t) => setSt((s) => ({ ...s, parentTheme: t })),
    switchToChild: (id) => setSt((s) => ({ ...s, mode: "child", activeChildId: id, focusChildId: id })),
    switchToParent: () => setSt((s) => ({ ...s, mode: "parent" })),
    switchToAdmin: () => setSt((s) => ({ ...s, mode: "admin" })),
    setFocusChild: (id) => setSt((s) => ({ ...s, focusChildId: id })),
    addChild: () => {
      const used = st.children.map((c) => c.theme);
      const theme = (Object.keys(THEMES) as ThemeKey[]).find((t) => !used.includes(t)) || "grape";
      const nc: ChildProfile = { id: "k" + Date.now(), name: "New child", age: 7, gender: "other", theme, interests: ["Animals"] };
      setSt((s) => ({ ...s, children: [...s.children, nc], focusChildId: nc.id }));
      return nc;
    },
    updateChild: (c) => setSt((s) => ({ ...s, children: s.children.map((x) => (x.id === c.id ? c : x)) })),
    removeChild: (id) => setSt((s) => {
      if (s.children.length <= 1) return s;
      const rest = s.children.filter((c) => c.id !== id);
      const fallback = rest[0].id;
      return {
        ...s, children: rest,
        activeChildId: s.activeChildId === id ? fallback : s.activeChildId,
        focusChildId: s.focusChildId === id ? fallback : s.focusChildId,
        mode: s.mode === "child" && s.activeChildId === id ? "parent" : s.mode,
      };
    }),
  };
  return <Ctx.Provider value={value}>{tree}</Ctx.Provider>;
}

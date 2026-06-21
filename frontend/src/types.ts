// Mirrors the API /v1 contract (api/app/models.py). Keep in sync.
export type Fmt = "pptx" | "pdf" | "epub" | "txt" | "md";
export type Size = "small" | "medium" | "large";

export interface PlanRequest {
  age: number;
  gender?: string | null;
  interests?: string[];
  subjects?: string[];
  outcomes?: string[];
  cadence?: "every day" | "weekdays" | "weekends" | "once off" | "speech";
  scope?: "my country" | "my continent" | "the whole world";
  place?: string | null;
  speech_length?: string | null;
  speech_audience?: string[];
  speech_place?: string | null;
  include_sport?: boolean;
  sports?: string[];
  sport_custom?: string | null;
  include_faith?: boolean;
  faiths?: string[];
  faith_custom?: string | null;
  detail?: "summary" | "detailed";
  medium?: "illustration" | "text" | "both";
  size?: Size;
  fmt?: Fmt;
}
export interface Page {
  id: string; order: number; archetype: "focused" | "fun";
  domain: string; topic: string; anchor_visual: string;
  guideline: string; challenge: string; answer?: string; bloom_level: string;
}
export interface Plan { id: string; request: PlanRequest; pages: Page[]; created_at: string; }
export interface ExportJob { id: string; plan_id: string; fmt: Fmt; status: "queued" | "running" | "done" | "error"; download_url?: string | null; error?: string | null; }

export interface Feeds { world: string; trend: string; tools: string; fact: string; }

export interface Nudge { icon: string; title: string; detail: string; }
export interface Tip { kind: "child" | "adopt" | "avoid"; text: string; }
export interface ChildSnapshot { plans_done: number; loves: string; streak_days: number; summary: string; }
export interface ParentOverview { snapshot: ChildSnapshot; nudges: Nudge[]; tips_child: string[]; tips_self: Tip[]; }

export interface EduItem { icon: string; title: string; detail: string; }
export interface LifestyleBlock { category: string; color: string; title: string; activity: string; where: string; time: string; cost: string; day_label?: string | null; }
export interface FamilyLifestyle { range: "day" | "week" | "month"; blocks: LifestyleBlock[]; }
export interface Outing { label: string; title: string; desc: string; where: string; time: string; cost: string; }
export interface Itinerary { items: Outing[]; note?: string | null; }
export interface ItineraryRequest { area: string; scope: "local" | "provincial" | "national" | "international"; when: "week" | "weekend" | "duration" | "events"; days?: number; events?: string[]; }

export interface CanvasTool { name: string; color: string; icon: string; title: string; desc: string; }
export interface CanvasTools { education: CanvasTool[]; fun: CanvasTool[]; play: CanvasTool[]; }

export interface BrainItem { icon: string; title: string; detail: string; kind?: string; for_child?: string; for_parent?: string; for_family?: string; }
export interface BrainState { log: BrainItem[]; }

export interface UserPublic { id: string; email: string; created_at: string; }
export interface AuthReply { token: string; user: UserPublic; }

export interface FocusArea { id: string; label: string; icon: string; }
export interface CoachAction { text: string; measure: string; }
export interface CoachPhase { week: number; week_label: string; theme: string; actions: CoachAction[]; }
export interface CoachPlan {
  focus: string; focus_label: string; icon: string; age: number; weeks: number; concern: string;
  goal: string; phases: CoachPhase[]; midpoint_week: number; midpoint: string;
  nudges: string[]; indicators: string[]; gaps: string[]; professional: string; disclaimer: string;
}
export interface CoachRequest { age: number; focus: string; concern?: string; weeks: number; }

export interface Book {
  id: string; title: string; blurb: string; category: string; category_label: string;
  discipline: string; subject: string; topic: string; genre: string; mood: string;
  interests: string[]; age_min: number; age_max: number; pages: number; emoji: string; color: string;
}
export interface BookPage { title: string; text: string; challenge: string; answer: string; }
export interface BookDetail extends Book { book_pages: BookPage[]; full_text: string; }
export interface LibraryFacets {
  categories: { key: string; label: string; emoji: string; color: string; count: number }[];
  disciplines: string[]; subjects: string[]; genres: string[]; moods: string[]; age_bands: string[]; total: number;
}
export interface CatalogResp { total: number; items: Book[]; }
export interface LibraryFilters {
  category?: string; discipline?: string; subject?: string; genre?: string; mood?: string; age?: number; q?: string;
}

export interface WorkbenchAsset { id: string; name: string; section: string; items: string[]; file: string; created: number; }

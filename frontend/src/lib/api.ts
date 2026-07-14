// The seam: the frontend talks to the backend ONLY through here, over HTTP,
// using VITE_API_URL. No secrets. Token slot ready for when auth is switched on.
import type {
  AuthReply, BookDetail, BrainState, CanvasTools, CatalogResp, CoachPlan, CoachRequest, ExportJob, FamilyLifestyle, Feeds, FocusArea, Fmt, Itinerary, LibraryFacets, LibraryFilters,
  ItineraryRequest, ParentOverview, Plan, PlanRequest, UserPublic,
} from "../types";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8200/v1";

let authToken: string | null = null;
export function setAuthToken(t: string | null) { authToken = t; }

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

export const api = {
  signup: (email: string, password: string) => http<AuthReply>("/auth/signup", { method: "POST", body: JSON.stringify({ email, password }) }),
  login: (email: string, password: string) => http<AuthReply>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => http<UserPublic>("/auth/me"),
  workbenchAssets: (section?: string) => http<{ assets: import("../types").WorkbenchAsset[] }>(`/workbench/assets${section ? `?section=${section}` : ""}`),
  workbenchUpload: async (fd: FormData) => {
    const headers: Record<string, string> = {};
    if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
    const res = await fetch(`${BASE}/workbench/assets`, { method: "POST", body: fd, headers });
    if (!res.ok) throw new Error(`upload ${res.status}`);
    return res.json();
  },
  workbenchImageUrl: (id: string) => `${BASE}/workbench/assets/${id}/image`,
  workbenchDelete: (id: string) => http<{ deleted: boolean }>(`/workbench/assets/${id}`, { method: "DELETE" }),
  adminErrorsList: (limit = 200) => http<{ errors: import("../types").AdminError[] }>(`/admin/errors?limit=${limit}`),
  adminErrorsPurge: (olderThanDays = 2) => http<{ deleted: number }>(`/admin/errors/purge?older_than_days=${olderThanDays}`, { method: "POST" }),
  adminErrorsClear: () => http<{ deleted: number }>(`/admin/errors`, { method: "DELETE" }),
  urlFetch: (url: string) => http<{ title: string; text: string; url: string }>(`/url-fetch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  }),
  transcribe: async (audio: Blob, filename = "audio.webm") => {
    const fd = new FormData();
    fd.append("file", audio, filename);
    const headers: Record<string, string> = {};
    if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
    const res = await fetch(`${BASE}/transcribe`, { method: "POST", body: fd, headers });
    if (!res.ok) {
      // Pull the FastAPI detail if present so error messages can be surfaced.
      let msg = `transcribe ${res.status}`;
      try { const j = await res.json(); if (j?.detail) msg = String(j.detail); } catch { /* keep generic */ }
      throw new Error(msg);
    }
    return (await res.json()) as { text: string };
  },
  libraryFacets: () => http<LibraryFacets>("/library/facets"),
  libraryCatalog: (f: LibraryFilters = {}) => {
    const p = new URLSearchParams();
    Object.entries(f).forEach(([k, v]) => { if (v !== undefined && v !== "" && v !== null) p.set(k, String(v)); });
    const qs = p.toString();
    return http<CatalogResp>(`/library/catalog${qs ? "?" + qs : ""}`);
  },
  libraryBook: (id: string) => http<BookDetail>(`/library/${id}`),
  libraryDownload: async (id: string, fmt: string) => {
    const headers: Record<string, string> = {};
    if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
    const res = await fetch(`${BASE}/library/${id}/download?fmt=${fmt}`, { headers });
    if (!res.ok) throw new Error(`download ${res.status}`);
    return res.blob();
  },
  coachFocusAreas: () => http<FocusArea[]>("/coach/focus-areas"),
  coachPlan: (req: CoachRequest) => http<CoachPlan>("/coach/plan", { method: "POST", body: JSON.stringify(req) }),
  resetRequest: (email: string) => http<{ message: string }>("/auth/reset-request", { method: "POST", body: JSON.stringify({ email }) }),
  feeds: (shuffle = false) => http<Feeds>(`/feeds${shuffle ? "?shuffle=true" : ""}`),
  createPlan: (req: PlanRequest) => http<Plan>("/plans", { method: "POST", body: JSON.stringify(req) }),
  requestExport: (id: string, fmt: Fmt) => http<ExportJob>(`/plans/${id}/exports`, { method: "POST", body: JSON.stringify({ fmt }) }),
  getExport: (id: string) => http<ExportJob>(`/exports/${id}`),
  ask: (message: string, opts?: { plan_id?: string; mode?: string }) => http<{ reply: string }>("/ask", { method: "POST", body: JSON.stringify({ message, plan_id: opts?.plan_id, mode: opts?.mode }) }),
  askVision: (message: string, image: string, media_type: string, mode?: string) => http<{ reply: string }>("/ask-vision", { method: "POST", body: JSON.stringify({ message, image, media_type, mode }) }),
  fetchUrl: (url: string) => http<{ text: string }>("/fetch-url", { method: "POST", body: JSON.stringify({ url }) }),
  parentOverview: () => http<ParentOverview>("/parent/overview"),
  checkin: (rating: string) => http<{ reply: string }>("/parent/checkin", { method: "POST", body: JSON.stringify({ rating }) }),
  familyEducation: () => http<EduItemList>("/family/education"),
  familyLifestyle: (range: string) => http<FamilyLifestyle>(`/family/lifestyle?range=${range}`),
  itineraryOptions: () => http<{ areas: string[]; events: string[] }>("/family/itinerary/options"),
  itinerary: (req: ItineraryRequest) => http<Itinerary>("/family/itinerary", { method: "POST", body: JSON.stringify(req) }),
  canvasTools: () => http<CanvasTools>("/canvas/tools"),
  brainLog: () => http<BrainState>("/brain/log"),
  brainFeed: (payload: { text?: string; url?: string; source_name?: string; kind?: string }) => http<BrainState>("/brain/feed", { method: "POST", body: JSON.stringify(payload) }),
  growthList: (kind: string, childId?: string) => http<Record<string, unknown>[]>(`/growth/${kind}${childId ? `?child_id=${encodeURIComponent(childId)}` : ""}`),
  growthPut: (kind: string, item: Record<string, unknown>) => http<Record<string, unknown>>(`/growth/${kind}`, { method: "POST", body: JSON.stringify(item) }),
  growthDelete: (kind: string, id: string) => http<{ deleted: number }>(`/growth/${kind}/${id}`, { method: "DELETE" }),
  feedbackSubmit: (body: Record<string, unknown>) => http<{ ok: boolean; id: string }>("/feedback", { method: "POST", body: JSON.stringify(body) }),
  feedbackMine: () => http<Record<string, unknown>[]>("/feedback/mine"),
  adminFeedback: () => http<Record<string, unknown>[]>("/admin/feedback"),
  adminFeedbackUpdate: (id: string, body: Record<string, unknown>) => http<Record<string, unknown>>(`/admin/feedback/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  adminRelease: () => http<Record<string, unknown>[]>("/admin/release"),
  adminReleasePut: (body: Record<string, unknown>) => http<Record<string, unknown>>("/admin/release", { method: "POST", body: JSON.stringify(body) }),
  adminReleaseDelete: (id: string) => http<{ deleted: number }>(`/admin/release/${id}`, { method: "DELETE" }),
  adminDataStats: () => http<Record<string, number>>("/admin/data/stats"),
  adminDataPurge: (body: Record<string, unknown>) => http<{ collection: string; purged: number }>("/admin/data/purge", { method: "POST", body: JSON.stringify(body) }),
  benchmarks: (scope?: string, country?: string, ageGroup?: string) => http<Record<string, unknown>[]>(`/benchmarks?${new URLSearchParams({ ...(scope ? { scope } : {}), ...(country ? { country } : {}), ...(ageGroup ? { age_group: ageGroup } : {}) }).toString()}`),
  adminBenchmarks: () => http<Record<string, unknown>[]>("/admin/benchmarks"),
  adminBenchPut: (body: Record<string, unknown>) => http<Record<string, unknown>>("/admin/benchmarks", { method: "POST", body: JSON.stringify(body) }),
  adminBenchPatch: (id: string, body: Record<string, unknown>) => http<Record<string, unknown>>(`/admin/benchmarks/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  adminBenchDel: (id: string) => http<{ deleted: number }>(`/admin/benchmarks/${id}`, { method: "DELETE" }),
  adminBenchSuggest: (body: Record<string, unknown>) => http<Record<string, unknown>[]>("/admin/benchmarks/suggest", { method: "POST", body: JSON.stringify(body) }),
  adminBenchConfigGet: () => http<Record<string, unknown>>("/admin/benchmarks/config"),
  adminBenchConfigSet: (body: Record<string, unknown>) => http<Record<string, unknown>>("/admin/benchmarks/config", { method: "POST", body: JSON.stringify(body) }),
  cogbench: () => http<Record<string, unknown>[]>("/cogbench"),
  adminCogbench: () => http<Record<string, unknown>[]>("/admin/cogbench"),
  adminCogbenchPut: (body: Record<string, unknown>) => http<Record<string, unknown>>("/admin/cogbench", { method: "POST", body: JSON.stringify(body) }),
  adminCogbenchPatch: (id: string, body: Record<string, unknown>) => http<Record<string, unknown>>(`/admin/cogbench/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  adminCogbenchDel: (id: string) => http<{ deleted: number }>(`/admin/cogbench/${id}`, { method: "DELETE" }),
  adminCogbenchSuggest: (body: Record<string, unknown>) => http<Record<string, unknown>>("/admin/cogbench/suggest", { method: "POST", body: JSON.stringify(body) }),
  knowledgeFeed: (body: Record<string, unknown>) => http<Record<string, unknown>>("/knowledge/feed", { method: "POST", body: JSON.stringify(body) }),
  knowledge: () => http<Record<string, unknown>[]>("/knowledge"),
  adminKnowledge: () => http<Record<string, unknown>[]>("/admin/knowledge"),
  adminKnowledgePut: (body: Record<string, unknown>) => http<Record<string, unknown>>("/admin/knowledge", { method: "POST", body: JSON.stringify(body) }),
  adminKnowledgePatch: (id: string, body: Record<string, unknown>) => http<Record<string, unknown>>(`/admin/knowledge/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  adminKnowledgeDel: (id: string) => http<{ deleted: number }>(`/admin/knowledge/${id}`, { method: "DELETE" }),
  adminKnowledgeSuggest: (body: Record<string, unknown>) => http<Record<string, unknown>>("/admin/knowledge/suggest", { method: "POST", body: JSON.stringify(body) }),
  adminKnowledgeConfigGet: () => http<Record<string, unknown>>("/admin/knowledge/config"),
  adminKnowledgeConfigSet: (body: Record<string, unknown>) => http<Record<string, unknown>>("/admin/knowledge/config", { method: "POST", body: JSON.stringify(body) }),
  plannerGet: (kind: string) => http<{ kind: string; store: Record<string, unknown>; updated_at: string }>(`/planner/${kind}`),
  plannerPut: (kind: string, store: unknown) => http<{ ok: boolean }>(`/planner/${kind}`, { method: "POST", body: JSON.stringify({ store }) }),
  journalList: (scope?: string, childId?: string) => http<Record<string, unknown>[]>(`/journal?${new URLSearchParams({ ...(scope ? { scope } : {}), ...(childId ? { child_id: childId } : {}) }).toString()}`),
  journalAdd: (body: Record<string, unknown>) => http<Record<string, unknown>>("/journal", { method: "POST", body: JSON.stringify(body) }),
  journalPatch: (id: string, body: Record<string, unknown>) => http<Record<string, unknown>>(`/journal/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  journalSummary: (body: Record<string, unknown>) => http<Record<string, unknown>>("/journal/summary", { method: "POST", body: JSON.stringify(body) }),
  journalDel: (id: string) => http<{ deleted: number }>(`/journal/${id}`, { method: "DELETE" }),
  journalPatterns: (body: Record<string, unknown>) => http<Record<string, unknown>>("/journal/patterns", { method: "POST", body: JSON.stringify(body) }),
};
type EduItemList = import("../types").EduItem[];

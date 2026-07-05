import { api } from "./api";

/* growthStore — the single seam the growth loop talks to. Mongo-backed today;
   the UI only calls these typed helpers, scoped server-side to the signed-in user. */

export type NeedStatus = "emerging" | "working" | "improving" | "achieved";
export const NEED_STATUS: { key: NeedStatus; label: string; color: string }[] = [
  { key: "emerging", label: "Emerging", color: "#8A8AA0" },
  { key: "working", label: "Working on it", color: "#5AA7E6" },
  { key: "improving", label: "Improving", color: "#FFB02E" },
  { key: "achieved", label: "Achieved", color: "#5BBF8A" },
];

export interface GrowthNeed { id: string; child_id: string; title: string; area: string; status: NeedStatus; note?: string; created_at?: string; updated_at?: string; }
export interface ReviewCycle { id: string; child_id: string; period: string; summary: string; achieved: string[]; not_achieved: string[]; improvements: string[]; next: string[]; scores?: Record<string, number>; issues?: string[]; strengths?: string[]; created_at?: string; }
export interface Evaluation { id: string; child_id: string; title: string; source_text: string; summary: string; working: string[]; watch: string[]; recommendations: { task: string; focus: string; durationDays: number }[]; created_at?: string; }
export interface FeedbackItem { id: string; user_id?: string; email?: string; kind: "feedback" | "feature"; message: string; status: string; admin_note?: string; notified?: boolean; created_at?: string; }
export interface ReleaseItem { id: string; title: string; source_id?: string; status: string; start?: string; end?: string; progress?: number; created_at?: string; }

const asNeed = (d: Record<string, unknown>) => d as unknown as GrowthNeed;
const asReview = (d: Record<string, unknown>) => d as unknown as ReviewCycle;
const asEval = (d: Record<string, unknown>) => d as unknown as Evaluation;
const asFb = (d: Record<string, unknown>) => d as unknown as FeedbackItem;
const asRel = (d: Record<string, unknown>) => d as unknown as ReleaseItem;

export const growth = {
  listNeeds: (childId: string) => api.growthList("needs", childId).then((r) => r.map(asNeed)),
  putNeed: (n: Partial<GrowthNeed> & { child_id: string }) => api.growthPut("needs", n as Record<string, unknown>).then(asNeed),
  delNeed: (id: string) => api.growthDelete("needs", id),
  listReviews: (childId: string) => api.growthList("reviews", childId).then((r) => r.map(asReview)),
  putReview: (rc: Partial<ReviewCycle> & { child_id: string }) => api.growthPut("reviews", rc as Record<string, unknown>).then(asReview),
  delReview: (id: string) => api.growthDelete("reviews", id),
  listEvals: (childId: string) => api.growthList("evaluations", childId).then((r) => r.map(asEval)),
  putEval: (e: Partial<Evaluation> & { child_id: string }) => api.growthPut("evaluations", e as Record<string, unknown>).then(asEval),
  delEval: (id: string) => api.growthDelete("evaluations", id),
  submit: (kind: "feedback" | "feature", message: string, email?: string) => api.feedbackSubmit({ kind, message, email }),
  mine: () => api.feedbackMine().then((r) => r.map(asFb)),
  adminFeedback: () => api.adminFeedback().then((r) => r.map(asFb)),
  adminUpdateFeedback: (id: string, patch: Partial<FeedbackItem>) => api.adminFeedbackUpdate(id, patch as Record<string, unknown>).then(asFb),
  adminRelease: () => api.adminRelease().then((r) => r.map(asRel)),
  adminPutRelease: (r: Partial<ReleaseItem>) => api.adminReleasePut(r as Record<string, unknown>).then(asRel),
  adminDelRelease: (id: string) => api.adminReleaseDelete(id),
  adminStats: () => api.adminDataStats(),
  adminPurge: (collection: string, opts: { older_than_days?: number; status?: string }) => api.adminDataPurge({ collection, ...opts }),
};

export function feedBrain(text: string, source = "Growth", kind = "growth") {
  api.brainFeed({ text, source_name: source, kind }).catch(() => {});
}

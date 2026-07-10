import { api } from "./api";

export interface JournalEntry { id: string; scope: "child" | "family" | "general"; child_id?: string; text: string; mood?: string; created_at?: string; }
export interface JournalTheme { theme: string; trend: string; }
export interface JournalPatterns { summary: string; themes: JournalTheme[]; watch: string[]; count?: number; }

export const journal = {
  list: (scope?: string, childId?: string) => api.journalList(scope, childId).then((r) => r as unknown as JournalEntry[]),
  add: (e: { scope: string; child_id?: string; text: string; mood?: string }) => api.journalAdd(e as Record<string, unknown>).then((r) => r as unknown as JournalEntry),
  del: (id: string) => api.journalDel(id),
  patterns: (b: { scope?: string; child_id?: string; who?: string }) => api.journalPatterns(b as Record<string, unknown>).then((r) => r as unknown as JournalPatterns),
};

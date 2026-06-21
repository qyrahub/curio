import { setAuthToken } from "./api";
import type { UserPublic } from "../types";
const TK = "curio_token", UK = "curio_user";

export function loadAuth(): UserPublic | null {
  const t = localStorage.getItem(TK);
  if (t) setAuthToken(t);
  return getUser();
}
export function saveAuth(token: string, user: UserPublic) {
  localStorage.setItem(TK, token);
  localStorage.setItem(UK, JSON.stringify(user));
  setAuthToken(token);
}
export function clearAuth() {
  localStorage.removeItem(TK); localStorage.removeItem(UK); setAuthToken(null);
}
export function getUser(): UserPublic | null {
  const s = localStorage.getItem(UK);
  return s ? (JSON.parse(s) as UserPublic) : null;
}

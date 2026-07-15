import crypto from "node:crypto";
import { HttpError } from "../http/errors.js";
import {
  createSession,
  findOrCreateUser,
  sessionInfo,
  type SessionInfo,
} from "./store.js";

// Anti-abuso do modo convidado (cada conta pode receber bônus da authority).
const guestCreations: number[] = [];
const GUEST_WINDOW_MS = 60 * 60 * 1000;
const MAX_GUESTS_PER_WINDOW = 20;

/** Convidado (devnet): conta custodial sem Google — útil pra testar o fluxo
 *  social completo sem configurar OAuth. Desative com ALLOW_GUEST=0. */
export async function loginAsGuest(): Promise<SessionInfo> {
  if (process.env.ALLOW_GUEST === "0") {
    throw new HttpError(403, "modo convidado desativado");
  }
  const now = Date.now();
  while (guestCreations.length && now - guestCreations[0] > GUEST_WINDOW_MS) {
    guestCreations.shift();
  }
  if (guestCreations.length >= MAX_GUESTS_PER_WINDOW) {
    throw new HttpError(429, "limite de contas convidadas — tente mais tarde");
  }
  guestCreations.push(now);
  const user = await findOrCreateUser("guest", crypto.randomUUID());
  return sessionInfo(user, createSession(user));
}

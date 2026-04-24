import { createHash, randomBytes } from "crypto";

export function generateEditToken(): string {
  return randomBytes(24).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function verifyToken(token: string | null | undefined, hash: string): boolean {
  if (!token) return false;
  return hashToken(token) === hash;
}

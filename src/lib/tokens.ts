import { createHash, randomBytes, randomInt } from "crypto";

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createVerifyToken() {
  return randomBytes(32).toString("hex");
}

export function createResetCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

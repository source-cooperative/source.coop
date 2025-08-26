// This file contains server-side only crypto functions
// DO NOT import this file in client-side code
import * as crypto from "crypto";

export function generateAccessKeyID(): string {
  const prefix = "SC";
  const length = 22;
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";

  // Generate cryptographically strong random values
  const randomBytes = crypto.randomBytes(length);

  for (let i = 0; i < length; i++) {
    // Use modulo to map the random byte to an index in the chars string
    const randomIndex = randomBytes[i] % chars.length;
    result += chars[randomIndex];
  }

  return prefix + result;
}

export function generateSecretAccessKey(): string {
  const length = 64;
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";

  // Generate cryptographically strong random values
  const randomBytes = crypto.randomBytes(length);

  for (let i = 0; i < length; i++) {
    // Use modulo to map the random byte to an index in the chars string
    const randomIndex = randomBytes[i] % chars.length;
    result += chars[randomIndex];
  }

  return result;
}

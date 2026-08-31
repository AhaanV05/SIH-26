/**
 * Stateless, signed demo-session tokens shared by route handlers and middleware.
 *
 * This deliberately contains no database imports: middleware runs at the edge
 * boundary, while route handlers subsequently load the user and memberships from
 * Prisma before authorizing an operation. The fallback secret is only permitted
 * outside production so the offline demo remains runnable without a local env.
 */

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;
const DEMO_FALLBACK_SECRET = "mahasetu-offline-demo-session-secret";

type SessionPayload = {
  expiresAt: number;
  userId: string;
};

function getSessionSecret(): string {
  const configuredSecret = process.env.DEMO_SESSION_SECRET;
  if (configuredSecret) return configuredSecret;

  if (process.env.NODE_ENV === "production") {
    throw new Error("DEMO_SESSION_SECRET must be configured in production");
  }

  return DEMO_FALLBACK_SECRET;
}

function encodeBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function decodeBase64Url(value: string): string | null {
  try {
    const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

async function sign(value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSessionSecret()),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  let binary = "";
  for (const byte of new Uint8Array(signature)) binary += String.fromCharCode(byte);

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;

  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

export async function createSession(userId: string): Promise<string> {
  const payload: SessionPayload = { expiresAt: Date.now() + SESSION_DURATION_MS, userId };
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  return `${encodedPayload}.${await sign(encodedPayload)}`;
}

export async function readSession(sessionId: string | undefined): Promise<SessionPayload | null> {
  if (!sessionId) return null;

  const [encodedPayload, signature, ...extraParts] = sessionId.split(".");
  if (!encodedPayload || !signature || extraParts.length > 0) return null;

  try {
    const expectedSignature = await sign(encodedPayload);
    if (!constantTimeEqual(signature, expectedSignature)) return null;

    const decodedPayload = decodeBase64Url(encodedPayload);
    if (!decodedPayload) return null;
    const payload = JSON.parse(decodedPayload) as Partial<SessionPayload>;

    if (
      typeof payload.userId !== "string" ||
      payload.userId.length === 0 ||
      typeof payload.expiresAt !== "number" ||
      !Number.isFinite(payload.expiresAt) ||
      payload.expiresAt <= Date.now()
    ) {
      return null;
    }

    return { expiresAt: payload.expiresAt, userId: payload.userId };
  } catch {
    return null;
  }
}

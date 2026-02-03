/**
 * Edge Runtime compatible CSRF protection using Web Crypto API
 * 
 * This replaces the Node.js crypto module version for use in middleware
 * which runs in Edge Runtime (doesn't support Node.js modules)
 */

const CSRF_SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "fallback-csrf-secret-change-in-production";
const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

/**
 * Generate random base64url string using Web Crypto API
 */
async function generateRandomString(length: number): Promise<string> {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  
  // Convert to base64url
  const base64 = btoa(String.fromCharCode(...array));
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Create HMAC using Web Crypto API
 */
async function createHmacWeb(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  
  // Import key for HMAC
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  // Sign the data
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(data)
  );
  
  // Convert to base64url
  const bytes = new Uint8Array(signature);
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Timing-safe string comparison
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * Generate a CSRF token tied to a session
 * Token format: base64url(randomBytes).timestamp.hmac
 */
export async function generateCSRFToken(sessionId: string): Promise<string> {
  const timestamp = Date.now();
  const randomPart = await generateRandomString(32);
  
  // Create HMAC of the token parts + session
  const data = `${randomPart}.${timestamp}.${sessionId}`;
  const hmac = await createHmacWeb(data, CSRF_SECRET);
  
  return `${randomPart}.${timestamp}.${hmac}`;
}

/**
 * Validate a CSRF token
 * Returns true if valid, false otherwise
 */
export async function validateCSRFToken(token: string, sessionId: string): Promise<boolean> {
  if (!token || typeof token !== "string") {
    return false;
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return false;
  }

  const [randomPart, timestampStr, providedHmac] = parts;
  const timestamp = parseInt(timestampStr, 10);

  // Check if token has expired
  if (isNaN(timestamp) || Date.now() - timestamp > TOKEN_EXPIRY_MS) {
    console.log("CSRF token expired");
    return false;
  }

  // Recreate the expected HMAC
  const data = `${randomPart}.${timestamp}.${sessionId}`;
  const expectedHmac = await createHmacWeb(data, CSRF_SECRET);

  // Use timing-safe comparison to prevent timing attacks
  return timingSafeEqual(providedHmac, expectedHmac);
}

/**
 * Check if a request method requires CSRF validation
 */
export function requiresCSRFValidation(method: string): boolean {
  const mutatingMethods = ["POST", "PUT", "PATCH", "DELETE"];
  return mutatingMethods.includes(method.toUpperCase());
}

/**
 * Get a unique session identifier for CSRF purposes
 * Uses a combination of user ID and session token
 */
export async function getSessionIdentifier(sessionToken: string | undefined, userId: string | undefined): Promise<string> {
  // If we have both, combine them
  if (sessionToken && userId) {
    const hmac = await createHmacWeb(`${sessionToken}.${userId}`, CSRF_SECRET);
    return hmac.substring(0, 32);
  }
  
  // Fallback to just session token or userId
  const identifier = sessionToken || userId || "anonymous";
  const hmac = await createHmacWeb(identifier, CSRF_SECRET);
  return hmac.substring(0, 32);
}

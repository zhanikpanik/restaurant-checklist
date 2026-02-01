import { randomBytes, createHmac, timingSafeEqual } from "crypto";

const CSRF_SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "fallback-csrf-secret-change-in-production";
const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

interface CSRFTokenData {
  token: string;
  timestamp: number;
}

/**
 * Generate a CSRF token tied to a session
 * Token format: base64(randomBytes).timestamp.hmac
 */
export function generateCSRFToken(sessionId: string): string {
  const timestamp = Date.now();
  const randomPart = randomBytes(32).toString("base64url");
  
  // Create HMAC of the token parts + session
  const data = `${randomPart}.${timestamp}.${sessionId}`;
  const hmac = createHmac("sha256", CSRF_SECRET)
    .update(data)
    .digest("base64url");
  
  return `${randomPart}.${timestamp}.${hmac}`;
}

/**
 * Validate a CSRF token
 * Returns true if valid, false otherwise
 */
export function validateCSRFToken(token: string, sessionId: string): boolean {
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
  const expectedHmac = createHmac("sha256", CSRF_SECRET)
    .update(data)
    .digest("base64url");

  // Use timing-safe comparison to prevent timing attacks
  try {
    const providedBuffer = Buffer.from(providedHmac, "base64url");
    const expectedBuffer = Buffer.from(expectedHmac, "base64url");
    
    if (providedBuffer.length !== expectedBuffer.length) {
      return false;
    }
    
    return timingSafeEqual(providedBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

/**
 * Extract CSRF token from request headers or body
 */
export function getCSRFTokenFromRequest(request: Request): string | null {
  // Check X-CSRF-Token header first (preferred for API calls)
  const headerToken = request.headers.get("X-CSRF-Token");
  if (headerToken) {
    return headerToken;
  }

  // For form submissions, we'd need to parse the body
  // But since we're using JSON APIs, header is sufficient
  return null;
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
export function getSessionIdentifier(sessionToken: string | undefined, userId: string | undefined): string {
  // If we have both, combine them
  if (sessionToken && userId) {
    return createHmac("sha256", CSRF_SECRET)
      .update(`${sessionToken}.${userId}`)
      .digest("base64url")
      .substring(0, 32);
  }
  
  // Fallback to just session token or userId
  const identifier = sessionToken || userId || "anonymous";
  return createHmac("sha256", CSRF_SECRET)
    .update(identifier)
    .digest("base64url")
    .substring(0, 32);
}

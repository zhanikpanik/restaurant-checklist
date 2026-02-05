import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth-config";
import { validateCSRFToken, requiresCSRFValidation, getSessionIdentifier } from "@/lib/csrf-edge";

// Routes that don't require authentication
const publicRoutes = ["/login", "/setup", "/api/auth", "/api/health", "/api/debug-auth", "/api/poster/oauth"];

// API routes exempt from CSRF (webhooks, OAuth callbacks, etc.)
const csrfExemptRoutes = [
  "/api/auth",
  "/api/poster/oauth",
  "/api/health",
  "/api/csrf", // CSRF token endpoint itself
  "/api/orders/bulk-update", // Temporary exemption for bulk updates
];

// Role-based route access
const roleRoutes: Record<string, string[]> = {
  admin: ["*"], // Access to all
  manager: ["/", "/manager", "/custom", "/cart", "/delivery", "/api"],
  staff: ["/", "/custom", "/cart", "/api/sections", "/api/section-products", "/api/orders", "/api/categories"],
  delivery: ["/", "/delivery", "/api/orders"],
};

export default auth(async (req) => {
  const { pathname } = req.nextUrl;
  const method = req.method;
  
  // Allow public routes
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Get session from auth
  const session = req.auth;
  
  // Debug logging
  console.log("Middleware check:", { 
    pathname, 
    method,
    hasSession: !!session,
    sessionRole: session?.user?.role,
    sessionRestaurant: session?.user?.restaurantId,
  });
  
  if (!session) {
    // Redirect to login for page requests
    if (!pathname.startsWith("/api")) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    // Return 401 for API requests
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 }
    );
  }

  // CSRF validation for mutating API requests (Edge Runtime compatible)
  if (pathname.startsWith("/api") && requiresCSRFValidation(method)) {
    // Check if route is exempt from CSRF
    const isExempt = csrfExemptRoutes.some((route) => pathname.startsWith(route));
    
    if (!isExempt) {
      const csrfToken = req.headers.get("X-CSRF-Token");
      
      // Get the session identifier that was used during token generation
      // It's stored in the csrf-session-id cookie by /api/csrf endpoint
      const storedSessionId = req.cookies.get("csrf-session-id")?.value;
      
      // If we don't have a stored session ID, regenerate it (for backward compat)
      const sessionTokenCookie = req.cookies.get("authjs.session-token")?.value 
        || req.cookies.get("__Secure-authjs.session-token")?.value;
      const sessionId = storedSessionId || await getSessionIdentifier(sessionTokenCookie, session.user?.id);
      
      // Validate CSRF token (async with Web Crypto API)
      const isValid = await validateCSRFToken(csrfToken || "", sessionId);
      
      if (!csrfToken || !isValid) {
        console.log("CSRF validation failed:", { 
          pathname, 
          hasToken: !!csrfToken,
          hasStoredSessionId: !!storedSessionId,
          usingStoredId: !!storedSessionId,
        });
        return NextResponse.json(
          { success: false, error: "CSRF token invalid or missing" },
          { status: 403 }
        );
      }
    }
  }

  // Check role-based access
  const userRole = session.user?.role as string;
  const allowedRoutes = roleRoutes[userRole] || [];
  
  // Admin has access to everything
  if (allowedRoutes.includes("*")) {
    // Set restaurant_id cookie from session for API routes
    const response = NextResponse.next();
    response.cookies.set("restaurant_id", session.user?.restaurantId as string, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
    return response;
  }

  // Check if current route is allowed for user's role
  const isAllowed = allowedRoutes.some((route) => {
    if (route === pathname) return true;
    if (route.endsWith("*") && pathname.startsWith(route.slice(0, -1))) return true;
    if (pathname.startsWith(route)) return true;
    return false;
  });

  if (!isAllowed) {
    // Redirect to home for unauthorized page access
    if (!pathname.startsWith("/api")) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    
    // Return 403 for unauthorized API access
    return NextResponse.json(
      { success: false, error: "Access denied" },
      { status: 403 }
    );
  }

  // Set restaurant_id cookie from session for API routes
  const response = NextResponse.next();
  response.cookies.set("restaurant_id", session.user?.restaurantId as string, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
  
  return response;
});

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*|api/health).*)",
  ],
};

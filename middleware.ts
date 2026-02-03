import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth-config";
// TEMPORARILY DISABLED: Edge Runtime doesn't support Node.js crypto module
// import { validateCSRFToken, requiresCSRFValidation, getSessionIdentifier } from "@/lib/csrf";

// Routes that don't require authentication
const publicRoutes = ["/login", "/setup", "/api/auth", "/api/health", "/api/debug-auth", "/api/poster/oauth"];

// API routes exempt from CSRF (webhooks, OAuth callbacks, etc.)
const csrfExemptRoutes = [
  "/api/auth",
  "/api/poster/oauth",
  "/api/health",
  "/api/csrf", // CSRF token endpoint itself
];

// Role-based route access
const roleRoutes: Record<string, string[]> = {
  admin: ["*"], // Access to all
  manager: ["/", "/manager", "/custom", "/cart", "/delivery", "/api"],
  staff: ["/", "/custom", "/cart", "/api/sections", "/api/section-products", "/api/orders", "/api/categories"],
  delivery: ["/", "/delivery", "/api/orders"],
};

export default auth((req) => {
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

  // CSRF validation TEMPORARILY DISABLED
  // TODO: Move to Web Crypto API or implement in API routes
  // Edge Runtime doesn't support Node.js crypto module used by validateCSRFToken
  // 
  // Original code:
  // if (pathname.startsWith("/api") && requiresCSRFValidation(method)) {
  //   const isExempt = csrfExemptRoutes.some((route) => pathname.startsWith(route));
  //   if (!isExempt) {
  //     const csrfToken = req.headers.get("X-CSRF-Token");
  //     if (!csrfToken || !validateCSRFToken(csrfToken, expectedSessionId)) {
  //       return NextResponse.json({ success: false, error: "CSRF token invalid" }, { status: 403 });
  //     }
  //   }
  // }

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

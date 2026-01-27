import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth-config";

// Routes that don't require authentication
const publicRoutes = ["/login", "/api/auth", "/api/health", "/api/debug-auth"];

// Role-based route access
const roleRoutes: Record<string, string[]> = {
  admin: ["*"], // Access to all
  manager: ["/", "/manager", "/custom", "/cart", "/delivery", "/api"],
  staff: ["/", "/custom", "/cart", "/api/sections", "/api/section-products", "/api/orders", "/api/categories"],
  delivery: ["/", "/delivery", "/api/orders"],
};

export default auth((req) => {
  const { pathname } = req.nextUrl;
  
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

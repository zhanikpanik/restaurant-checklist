import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export type UserRole = "admin" | "manager" | "staff" | "delivery";

declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    restaurantId: string;
    restaurantName?: string;
  }
  
  interface Session {
    user: User;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        // Dynamic import to avoid Edge runtime issues
        const { verifyUserCredentials } = await import("@/lib/users");
        
        try {
          const user = await verifyUserCredentials(
            credentials.email as string,
            credentials.password as string
          );

          if (!user) {
            throw new Error("Invalid email or password");
          }

          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name,
            role: user.role as UserRole,
            restaurantId: user.restaurant_id,
            restaurantName: user.restaurant_name,
          };
        } catch (error) {
          console.error("Auth error:", error);
          throw error;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const t = token as any;
        const u = user as any;
        t.id = u.id;
        t.role = u.role;
        t.restaurantId = u.restaurantId;
        t.restaurantName = u.restaurantName;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        const s = session as any;
        const t = token as any;
        s.user.id = t.id;
        s.user.role = t.role;
        s.user.restaurantId = t.restaurantId;
        s.user.restaurantName = t.restaurantName;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" 
        ? "__Secure-authjs.session-token" 
        : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
});

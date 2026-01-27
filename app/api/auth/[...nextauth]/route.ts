import { handlers } from "@/lib/auth-config";

// Force Node.js runtime (bcryptjs doesn't work in Edge)
export const runtime = "nodejs";

export const { GET, POST } = handlers;

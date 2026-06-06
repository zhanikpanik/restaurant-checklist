import { NextRequest } from "next/server";
import { POST } from "./app/api/auth/forgot-password/route";

async function test() {
  const req = new NextRequest("http://localhost:3000/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email: "alto.kyrgyzstan@gmail.com" }),
  });

  const res = await POST(req);
  console.log("Status:", res.status);
  console.log("Body:", await res.json());
}

test().catch(console.error);
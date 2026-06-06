import { NextRequest } from "next/server";
import { POST } from "./app/api/invitations/route";

async function test() {
  const req = new NextRequest("http://localhost:3000/api/invitations", {
    method: "POST",
    body: JSON.stringify({
      role: "staff",
      sections: [{ section_id: 1, can_send_orders: true, can_receive_supplies: true }],
    }),
  });

  const res = await POST(req);
  console.log("Status:", res.status);
  console.log("Body:", await res.json());
}

test().catch(console.error);
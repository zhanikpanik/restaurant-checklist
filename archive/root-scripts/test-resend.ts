import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const resend = new Resend(process.env.RESEND_API_KEY);

async function testEmail() {
  console.log("Using API Key:", process.env.RESEND_API_KEY ? "Set (length: " + process.env.RESEND_API_KEY.length + ")" : "Not set");
  console.log("From:", process.env.EMAIL_FROM || "onboarding@resend.dev");

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || "onboarding@resend.dev",
      to: "alto.kyrgyzstan@gmail.com",
      subject: "Test Email from Script",
      html: "<p>If you see this, Resend is working.</p>",
    });

    if (error) {
      console.error("❌ Resend Error:", error);
    } else {
      console.log("✅ Success! Data:", data);
    }
  } catch (err) {
    console.error("❌ Crash:", err);
  }
}

testEmail();
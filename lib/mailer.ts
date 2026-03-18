import nodemailer from "nodemailer";

// Create a reusable transporter object using Gmail SMTP transport
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function sendPasswordResetEmail(email: string, resetLink: string) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.warn("⚠️ SMTP credentials not set. Email will not be sent. Reset link: " + resetLink);
    return { success: false, error: "SMTP credentials missing" };
  }

  try {
    const info = await transporter.sendMail({
      from: `"Restaurant Checklist" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Сброс пароля | Restaurant Checklist",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h2>Сброс пароля</h2>
          <p>Вы запросили сброс пароля для вашего аккаунта.</p>
          <p>Пожалуйста, нажмите на кнопку ниже, чтобы установить новый пароль:</p>
          <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold;">
            Установить новый пароль
          </a>
          <p>Или скопируйте и вставьте эту ссылку в адресную строку браузера:</p>
          <p style="word-break: break-all;"><a href="${resetLink}" style="color: #3B82F6;">${resetLink}</a></p>
          <hr style="border: none; border-top: 1px solid #eaeaea; margin: 30px 0;" />
          <p style="color: #888; font-size: 13px;">
            Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.
          </p>
        </div>
      `,
    });

    console.log("✅ Email sent successfully:", info.messageId);
    return { success: true, data: info };
  } catch (error: any) {
    console.error("❌ Failed to send email via nodemailer:", error);
    return { success: false, error: error.message || "Internal server error" };
  }
}

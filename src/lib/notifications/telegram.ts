import { IApplication } from "@/models/Application";
import { IDiagnosis } from "@/models/Diagnosis";

function severityEmoji(severity: string) {
  switch (severity) {
    case "critical":
      return "🚨";
    case "high":
      return "🔴";
    case "medium":
      return "🟠";
    default:
      return "🟡";
  }
}

export async function sendIncidentTelegram(
  chatId: string,
  application: IApplication,
  diagnosis: IDiagnosis
) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    throw new Error("Missing TELEGRAM_BOT_TOKEN environment variable");
  }

  const emoji = severityEmoji(diagnosis.severity);

  const text = [
    `${emoji} *${diagnosis.severity.toUpperCase()} Alert*`,
    ``,
    `*Application:* ${application.name}`,
    `*Problem:* ${diagnosis.rootCause}`,
    `*Confidence:* ${diagnosis.confidence}%`,
    `*Recommended Fix:* ${diagnosis.recommendedFix}`,
    ``,
    `_${new Date().toISOString()}_`,
  ].join("\n");

  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Telegram API error: ${res.status} ${body}`);
  }
}

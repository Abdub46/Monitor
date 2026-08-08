import nodemailer from "nodemailer";
import { IApplication } from "@/models/Application";
import { IDiagnosis } from "@/models/Diagnosis";

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env;
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) {
      throw new Error("Missing SMTP configuration");
    }
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT) || 587,
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
    });
  }
  return transporter;
}

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

export async function sendIncidentEmail(
  toEmail: string,
  application: IApplication,
  diagnosis: IDiagnosis
) {
  const emoji = severityEmoji(diagnosis.severity);
  const subject = `${emoji} ${diagnosis.severity.toUpperCase()} alert: ${application.name}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 560px;">
      <h2>${emoji} ${diagnosis.severity.toUpperCase()} Alert</h2>
      <p><strong>Application:</strong> ${application.name} (${application.environment})</p>
      <p><strong>Root cause:</strong> ${diagnosis.rootCause}</p>
      <p><strong>Confidence:</strong> ${diagnosis.confidence}%</p>
      <p><strong>Recommended fix:</strong> ${diagnosis.recommendedFix}</p>
      ${
        diagnosis.repairSteps.length
          ? `<p><strong>Steps:</strong></p><ol>${diagnosis.repairSteps
              .map((s) => `<li>${s}</li>`)
              .join("")}</ol>`
          : ""
      }
      <p style="color: #666; font-size: 12px;">Timestamp: ${new Date().toISOString()}</p>
    </div>
  `;

  await getTransporter().sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: toEmail,
    subject,
    html,
  });
}

import OpenAI from "openai";
import mongoose from "mongoose";
import Application, { IApplication } from "@/models/Application";
import HealthCheck, { IHealthCheck } from "@/models/HealthCheck";
import Incident from "@/models/Incident";
import Diagnosis, { IDiagnosis } from "@/models/Diagnosis";
import { calculateApplicationMetrics } from "@/lib/analytics/metrics";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("Missing OPENAI_API_KEY environment variable");
    }
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

const SYSTEM_PROMPT = `You are an AI assistant embedded in an application monitoring dashboard. You answer questions about the user's monitored applications using ONLY the context provided below — their current status, recent incidents, AI diagnoses, and reliability metrics.

Rules:
- Ground every answer in the provided context. If the data needed to answer isn't in the context, say so plainly rather than guessing.
- Be concise. Use plain language, not jargon, unless the user's question is technical.
- When asked to suggest improvements or prevention, base it on the actual recurring errors and incidents shown, not generic advice.
- You cannot take any action (you can't restart services, change settings, or acknowledge incidents) — you can only inform. If asked to do something, explain that and suggest what page in the dashboard covers it.`;

/**
 * Builds a bounded context block describing the user's applications,
 * recent incidents (with AI diagnoses), and reliability metrics.
 * Kept deliberately compact — this is injected into every chat
 * request as the system context, so unbounded growth would blow up
 * token usage and cost as a user's history grows.
 */


async function buildContext(userId: string): Promise<string> {
  const applications = await Application.find({ userId }).lean<IApplication[]>();

  if (applications.length === 0) {
    return "The user has no monitored applications yet.";
  }

  const appIds = applications.map((a) => a._id);

  const sections: string[] = [];

  for (const app of applications) {
   const latestCheck = await HealthCheck.findOne({ applicationId: app._id })
  .sort({ checkedAt: -1 })
  .lean<IHealthCheck>();

    const metrics = await calculateApplicationMetrics(app._id);





    const recentIncidents = await Incident.find({ applicationId: app._id })
      .sort({ startedAt: -1 })
      .limit(5)
      .lean();

    const diagnosisIds = recentIncidents.map((i) => i.diagnosisId).filter(Boolean);
    const diagnoses = await Diagnosis.find({
  _id: { $in: diagnosisIds },
}).lean<IDiagnosis[]>();

    const diagnosisMap = new Map(diagnoses.map((d) => [d._id.toString(), d]));

    const incidentLines = recentIncidents.map((inc) => {
      const diag = inc.diagnosisId ? diagnosisMap.get(inc.diagnosisId.toString()) : null;
      return `  - ${new Date(inc.startedAt).toISOString()} [${inc.status}] ${inc.reason}${
        diag
          ? ` | AI diagnosis: ${diag.rootCause} (${diag.confidence}% confidence, severity: ${diag.severity}). Fix: ${diag.recommendedFix}`
          : ""
      }`;
    });

    sections.push(
      `### ${app.name} (${app.environment})
Current status: ${latestCheck?.status ?? "no data yet"}
Uptime: ${metrics.uptimePercentDaily}% (24h), ${metrics.uptimePercentWeekly}% (7d), ${metrics.uptimePercentMonthly}% (30d)
Average response time: ${metrics.averageResponseTimeMs}ms
Incidents in last 30 days: ${metrics.incidentCount}
MTTR: ${metrics.mttrMinutes != null ? `${metrics.mttrMinutes} minutes` : "n/a"}
MTBF: ${metrics.mtbfHours != null ? `${metrics.mtbfHours} hours` : "n/a"}
Most common errors: ${
        metrics.mostCommonErrors.length > 0
          ? metrics.mostCommonErrors.map((e) => `"${e.error}" (×${e.count})`).join(", ")
          : "none"
      }
Recent incidents:
${incidentLines.length > 0 ? incidentLines.join("\n") : "  none"}`
    );
  }

  return sections.join("\n\n");
}

interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

export async function answerAssistantQuestion(
  userId: string,
  question: string,
  history: ConversationTurn[]
): Promise<string> {
  const context = await buildContext(userId);
  const openai = getClient();
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "system", content: `Current account context:\n\n${context}` },
      ...history.slice(-10).map((turn) => ({ role: turn.role, content: turn.content })),
      { role: "user", content: question },
    ],
    temperature: 0.3,
  });

  return completion.choices[0]?.message?.content ?? "I couldn't generate a response.";
}

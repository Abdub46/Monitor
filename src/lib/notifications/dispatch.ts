import { IApplication } from "@/models/Application";
import { IDiagnosis } from "@/models/Diagnosis";
import User, { IUser } from "@/models/User";
import { sendIncidentEmail } from "./email";
import { sendIncidentTelegram } from "./telegram";
import { sendIncidentPush } from "./push";

interface DispatchResult {
  channel: "email" | "telegram" | "push";
  success: boolean;
  error?: string;
}

/**
 * Sends the incident diagnosis to every channel the user has enabled.
 * Channels are independent — a failure on one (e.g. missing Telegram
 * config) never blocks the others.
 */
export async function dispatchIncidentNotifications(
  user: IUser,
  application: IApplication,
  diagnosis: IDiagnosis
): Promise<DispatchResult[]> {
  const results: DispatchResult[] = [];
  const prefs = user.notificationPreferences;

  if (prefs?.emailEnabled) {
    try {
      await sendIncidentEmail(user.email, application, diagnosis);
      results.push({ channel: "email", success: true });
    } catch (err) {
      results.push({
        channel: "email",
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  if (prefs?.telegramEnabled) {
    if (!user.telegramChatId) {
      results.push({ channel: "telegram", success: false, error: "No Telegram chat ID configured" });
    } else {
      try {
        await sendIncidentTelegram(user.telegramChatId, application, diagnosis);
        results.push({ channel: "telegram", success: true });
      } catch (err) {
        results.push({
          channel: "telegram",
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }
  }

  if (prefs?.pushEnabled) {
    if (!user.fcmTokens || user.fcmTokens.length === 0) {
      results.push({ channel: "push", success: false, error: "No push tokens registered" });
    } else {
      try {
        const { invalidTokens } = await sendIncidentPush(user.fcmTokens, application, diagnosis);
        if (invalidTokens.length > 0) {
          // Prune dead tokens so future sends don't keep failing on them.
          await User.updateOne(
            { _id: user._id },
            { $pull: { fcmTokens: { $in: invalidTokens } } }
          );
        }
        results.push({ channel: "push", success: true });
      } catch (err) {
        results.push({
          channel: "push",
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }
  }

  return results;
}

import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { IApplication } from "@/models/Application";
import { IDiagnosis } from "@/models/Diagnosis";

let adminApp: App | null = null;

function getAdminApp(): App {
  if (adminApp) return adminApp;

  const existing = getApps();
  if (existing.length > 0) {
    adminApp = existing[0];
    return adminApp;
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) {
    throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON environment variable");
  }

  const serviceAccount = JSON.parse(serviceAccountJson);
  adminApp = initializeApp({
    credential: cert(serviceAccount),
  });
  return adminApp;
}

/**
 * Sends a push notification to every registered FCM token for a user.
 * Returns the list of tokens that are no longer valid so the caller
 * can prune them from the user's record.
 */
export async function sendIncidentPush(
  fcmTokens: string[],
  application: IApplication,
  diagnosis: IDiagnosis
): Promise<{ invalidTokens: string[] }> {
  if (fcmTokens.length === 0) {
    return { invalidTokens: [] };
  }

  const messaging = getMessaging(getAdminApp());
  const invalidTokens: string[] = [];

  const results = await Promise.allSettled(
    fcmTokens.map((token) =>
      messaging.send({
        token,
        notification: {
          title: `${diagnosis.severity.toUpperCase()} alert: ${application.name}`,
          body: diagnosis.recommendedFix,
        },
        data: {
          applicationId: application._id.toString(),
          severity: diagnosis.severity,
        },
      })
    )
  );

  results.forEach((result, i) => {
    if (result.status === "rejected") {
      // Common for stale/uninstalled-app tokens; safe to prune.
      invalidTokens.push(fcmTokens[i]);
    }
  });

  return { invalidTokens };
}

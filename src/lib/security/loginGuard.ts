import SecurityEvent from "@/models/SecurityEvent";

const BRUTE_FORCE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const BRUTE_FORCE_THRESHOLD = 5; // failed attempts against one email
const SUSPICIOUS_IP_THRESHOLD = 10; // failed attempts from one IP across any accounts

/**
 * Records a failed login attempt and checks whether it crosses
 * brute-force or suspicious-IP thresholds. Persisted to MongoDB
 * (rather than in-memory) so detection is durable and correct across
 * serverless cold starts and multiple instances.
 */
export async function recordFailedLogin(email: string, ipAddress: string) {
  await SecurityEvent.create({
    email,
    ipAddress,
    type: "failed_login",
    severity: "low",
    details: `Failed login attempt for ${email}`,
  });

  const since = new Date(Date.now() - BRUTE_FORCE_WINDOW_MS);

  const [attemptsAgainstEmail, attemptsFromIp] = await Promise.all([
    SecurityEvent.countDocuments({
      email,
      type: "failed_login",
      createdAt: { $gte: since },
    }),
    SecurityEvent.countDocuments({
      ipAddress,
      type: "failed_login",
      createdAt: { $gte: since },
    }),
  ]);

  if (attemptsAgainstEmail >= BRUTE_FORCE_THRESHOLD) {
    await SecurityEvent.create({
      email,
      ipAddress,
      type: "brute_force_detected",
      severity: "high",
      details: `${attemptsAgainstEmail} failed login attempts for ${email} in the last 10 minutes`,
    });
  }

  if (attemptsFromIp >= SUSPICIOUS_IP_THRESHOLD) {
    await SecurityEvent.create({
      ipAddress,
      type: "suspicious_ip",
      severity: "critical",
      details: `${attemptsFromIp} failed login attempts from ${ipAddress} across accounts in the last 10 minutes`,
    });
  }
}

/**
 * Returns true if this email currently has enough recent failed
 * attempts that login should be blocked, independent of whether the
 * password given now is correct. Keeps a compromised-but-guessed
 * password from bypassing lockout on a lucky attempt.
 */
export async function isLoginLocked(email: string): Promise<boolean> {
  const since = new Date(Date.now() - BRUTE_FORCE_WINDOW_MS);
  const attempts = await SecurityEvent.countDocuments({
    email,
    type: "failed_login",
    createdAt: { $gte: since },
  });
  return attempts >= BRUTE_FORCE_THRESHOLD;
}

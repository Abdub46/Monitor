export type Environment = "production" | "staging" | "development";
export type CheckStatus = "online" | "slow" | "offline";
export type IncidentStatus = "open" | "resolved";
export type Severity = "low" | "medium" | "high" | "critical";

export interface ApplicationDTO {
  id: string;
  name: string;
  description?: string;
  url: string;
  healthEndpoint: string;
  apiBaseUrl?: string;
  expectedStatusCode: number;
  monitoringIntervalSeconds: number;
  environment: Environment;
  tags: string[];
  isActive: boolean;
  latestStatus?: CheckStatus;
  latestResponseTimeMs?: number;
  lastCheckedAt?: string;
}

export interface DiagnosisDTO {
  rootCause: string;
  confidence: number;
  severity: Severity;
  recommendedFix: string;
  repairSteps: string[];
  preventionTips: string[];
}

export interface IncidentDTO {
  id: string;
  applicationId: string;
  applicationName: string;
  startedAt: string;
  resolvedAt: string | null;
  status: IncidentStatus;
  reason: string;
  diagnosis: DiagnosisDTO | null;
}

import mongoose, { Schema, models, model } from "mongoose";

export type SecurityEventType =
  | "failed_login"
  | "brute_force_detected"
  | "excessive_failed_logins"
  | "rate_limit_exceeded"
  | "suspicious_ip";

export type SecuritySeverity = "low" | "medium" | "high" | "critical";

export interface ISecurityEvent {
  _id: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId; // set when the target account is known
  email?: string; // the email attempted, even if the account doesn't exist
  ipAddress: string;
  type: SecurityEventType;
  severity: SecuritySeverity;
  details: string;
  createdAt: Date;
}

const SecurityEventSchema = new Schema<ISecurityEvent>({
  userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
  email: { type: String },
  ipAddress: { type: String, required: true, index: true },
  type: {
    type: String,
    enum: [
      "failed_login",
      "brute_force_detected",
      "excessive_failed_logins",
      "rate_limit_exceeded",
      "suspicious_ip",
    ],
    required: true,
  },
  severity: { type: String, enum: ["low", "medium", "high", "critical"], default: "low" },
  details: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, index: true },
});

SecurityEventSchema.index({ createdAt: -1 });

export default models.SecurityEvent ||
  model<ISecurityEvent>("SecurityEvent", SecurityEventSchema);

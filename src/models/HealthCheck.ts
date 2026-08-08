import mongoose, { Schema, models, model } from "mongoose";

export type CheckStatus = "online" | "slow" | "offline";

export interface IHealthCheck {
  _id: mongoose.Types.ObjectId;
  applicationId: mongoose.Types.ObjectId;
  status: CheckStatus;
  responseTimeMs: number;
  httpStatusCode: number | null;
  checkedAt: Date;
  error?: string;
}

const HealthCheckSchema = new Schema<IHealthCheck>({
  applicationId: { type: Schema.Types.ObjectId, ref: "Application", required: true, index: true },
  status: { type: String, enum: ["online", "slow", "offline"], required: true },
  responseTimeMs: { type: Number, required: true },
  httpStatusCode: { type: Number, default: null },
  checkedAt: { type: Date, default: Date.now, index: true },
  error: { type: String },
});

// Compound index: this is the query pattern the dashboard hits constantly
// (latest checks for an application, ordered by time).
HealthCheckSchema.index({ applicationId: 1, checkedAt: -1 });

export default models.HealthCheck || model<IHealthCheck>("HealthCheck", HealthCheckSchema);

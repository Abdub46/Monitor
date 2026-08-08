import mongoose, { Schema, models, model } from "mongoose";

export type IncidentStatus = "open" | "resolved";

export interface IIncident {
  _id: mongoose.Types.ObjectId;
  applicationId: mongoose.Types.ObjectId;
  startedAt: Date;
  resolvedAt: Date | null;
  status: IncidentStatus;
  reason: string;
  diagnosisId?: mongoose.Types.ObjectId;
  notifiedAt?: Date;
}

const IncidentSchema = new Schema<IIncident>({
  applicationId: { type: Schema.Types.ObjectId, ref: "Application", required: true, index: true },
  startedAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date, default: null },
  status: { type: String, enum: ["open", "resolved"], default: "open" },
  reason: { type: String, required: true },
  diagnosisId: { type: Schema.Types.ObjectId, ref: "Diagnosis" },
  // Guards against re-notifying on the same incident if the cron
  // route overlaps or retries.
  notifiedAt: { type: Date },
});

IncidentSchema.index({ applicationId: 1, status: 1 });

export default models.Incident || model<IIncident>("Incident", IncidentSchema);

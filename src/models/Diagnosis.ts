import mongoose, { Schema, models, model } from "mongoose";

export type Severity = "low" | "medium" | "high" | "critical";

export interface IDiagnosis {
  _id: mongoose.Types.ObjectId;
  incidentId: mongoose.Types.ObjectId;
  applicationId: mongoose.Types.ObjectId;
  rootCause: string;
  confidence: number; // 0-100
  severity: Severity;
  recommendedFix: string;
  repairSteps: string[];
  preventionTips: string[];
  rawModelResponse?: string;
  createdAt: Date;
}

const DiagnosisSchema = new Schema<IDiagnosis>({
  incidentId: { type: Schema.Types.ObjectId, ref: "Incident", required: true, index: true },
  applicationId: { type: Schema.Types.ObjectId, ref: "Application", required: true, index: true },
  rootCause: { type: String, required: true },
  confidence: { type: Number, required: true, min: 0, max: 100 },
  severity: { type: String, enum: ["low", "medium", "high", "critical"], required: true },
  recommendedFix: { type: String, required: true },
  repairSteps: { type: [String], default: [] },
  preventionTips: { type: [String], default: [] },
  rawModelResponse: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export default models.Diagnosis || model<IDiagnosis>("Diagnosis", DiagnosisSchema);

import mongoose, { Schema, models, model } from "mongoose";

export type Environment = "production" | "staging" | "development";

export interface IApplication {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
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
  createdAt: Date;
  updatedAt: Date;
}

const ApplicationSchema = new Schema<IApplication>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    url: { type: String, required: true },
    healthEndpoint: { type: String, required: true },
    apiBaseUrl: { type: String },
    expectedStatusCode: { type: Number, default: 200 },
    monitoringIntervalSeconds: { type: Number, default: 60 },
    environment: {
      type: String,
      enum: ["production", "staging", "development"],
      default: "production",
    },
    tags: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default models.Application || model<IApplication>("Application", ApplicationSchema);

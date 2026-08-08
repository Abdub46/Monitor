import mongoose, { Schema, models, model } from "mongoose";

export type ChatRole = "user" | "assistant";

export interface IChatMessage {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: ChatRole;
  content: string;
  createdAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  role: { type: String, enum: ["user", "assistant"], required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

ChatMessageSchema.index({ userId: 1, createdAt: 1 });

export default models.ChatMessage || model<IChatMessage>("ChatMessage", ChatMessageSchema);

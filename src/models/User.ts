import mongoose, { Schema, models, model } from "mongoose";

export interface INotificationPreferences {
  emailEnabled: boolean;
  telegramEnabled: boolean;
  pushEnabled: boolean;
}

export interface IUser {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  resetToken?: string;
  resetTokenExpiry?: Date;
  telegramChatId?: string;
  fcmTokens: string[];
  notificationPreferences: INotificationPreferences;
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  resetToken: { type: String },
  resetTokenExpiry: { type: Date },
  // Telegram: user gets their numeric chat ID from @userinfobot and pastes
  // it into Settings; the bot token itself is a server-wide env var.
  telegramChatId: { type: String },
  // Push: a browser can register multiple FCM tokens (multiple devices/tabs).
  fcmTokens: { type: [String], default: [] },
  notificationPreferences: {
    emailEnabled: { type: Boolean, default: true },
    telegramEnabled: { type: Boolean, default: false },
    pushEnabled: { type: Boolean, default: false },
  },
});

export default models.User || model<IUser>("User", UserSchema);

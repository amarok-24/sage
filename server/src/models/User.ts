import mongoose, { Schema, Document } from 'mongoose';

interface IHabitDefinition {
  name:      string;       // Normalized: "meditation", "workout"
  aliases:   string[];     // Fuzzy terms: ["meditated", "mindfulness"]
  icon?:     string;       // Emoji or icon key
  createdAt: Date;
}

interface IUserPreferences {
  defaultCurrency:   string;    // ISO 4217, default "INR"
  timezone:          string;    // IANA, default "Asia/Kolkata"
  dailyCalorieGoal?: number;
  dailyProteinGoal?: number;
}

export interface IUser extends Document {
  email:                string;
  passwordHash:         string;
  name:                 string;
  habits:               IHabitDefinition[];
  preferences:          IUserPreferences;
  refreshTokenVersion:  number;   // Incremented on logout / password change
  createdAt:            Date;
  updatedAt:            Date;
}

const UserSchema = new Schema<IUser>({
  email: {
    type: String, required: true,
    unique: true, lowercase: true, trim: true, index: true,
  },
  passwordHash: { type: String, required: true },
  name:         { type: String, required: true, trim: true },
  habits: [{
    name:      { type: String, required: true },
    aliases:   [{ type: String }],
    icon:      { type: String, default: '🌱' },
    createdAt: { type: Date, default: Date.now },
  }],
  preferences: {
    defaultCurrency:   { type: String, default: 'INR' },
    timezone:          { type: String, default: 'Asia/Kolkata' },
    dailyCalorieGoal:  { type: Number },
    dailyProteinGoal:  { type: Number },
  },
  refreshTokenVersion: { type: Number, default: 0 },
}, { timestamps: true });

export const User = mongoose.model<IUser>('User', UserSchema);

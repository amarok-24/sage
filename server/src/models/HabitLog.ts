import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IHabitLog extends Document {
  userId:        Types.ObjectId;
  habitName:     string;            // Matches User.habits[].name
  date:          Date;              // Midnight of user's local date
  completed:     boolean;
  currentStreak: number;            // Running streak at time of log
  source:        'braindump' | 'manual';
  createdAt:     Date;
}

const HabitLogSchema = new Schema<IHabitLog>({
  userId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
  habitName: { type: String, required: true },
  date:      { type: Date, required: true },
  completed: { type: Boolean, required: true, default: true },
  currentStreak: { type: Number, default: 1 },
  source:    { type: String, enum: ['braindump', 'manual'], default: 'braindump' },
}, { timestamps: true });

// Unique: one log per habit per day per user
HabitLogSchema.index({ userId: 1, habitName: 1, date: 1 }, { unique: true });
HabitLogSchema.index({ userId: 1, date: -1 });

export const HabitLog = mongoose.model<IHabitLog>('HabitLog', HabitLogSchema);

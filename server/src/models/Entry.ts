import mongoose, { Schema, Document, Types } from 'mongoose';

export type EntryType = 'nutrition' | 'expense' | 'time_log' | 'sleep' | 'somatic_log' | 'journal';

export interface IEntry extends Document {
  userId:       Types.ObjectId;
  type:         EntryType;
  date:         Date;          // Logical date (user's local date at midnight)
  raw_text:     string;        // Original brain dump text
  braindump_id: string;        // Groups all entries from one brain dump
  data:         Record<string, any>;   // Polymorphic payload
  createdAt:    Date;
  updatedAt:    Date;
}

const EntrySchema = new Schema<IEntry>({
  userId: {
    type: Schema.Types.ObjectId, ref: 'User',
    required: true, index: true,
  },
  type: {
    type: String,
    enum: ['nutrition', 'expense', 'time_log', 'sleep', 'somatic_log', 'journal'],
    required: true, index: true,
  },
  date:         { type: Date, required: true, index: true },
  raw_text:     { type: String, required: true },
  braindump_id: { type: String, required: true, index: true },
  data:         { type: Schema.Types.Mixed, required: true },
}, { timestamps: true });

// Compound indexes
EntrySchema.index({ userId: 1, date: -1 });            // Dashboard: today's entries
EntrySchema.index({ userId: 1, type: 1, date: -1 });   // Filtered views
EntrySchema.index({ userId: 1, braindump_id: 1 });     // Braindump grouping

export const Entry = mongoose.model<IEntry>('Entry', EntrySchema);

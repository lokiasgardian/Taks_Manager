import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['signup', 'login', 'task_created', 'task_completed', 'task_deleted'],
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

// Indexes for fast aggregation by time and user
activityLogSchema.index({ createdAt: 1 });
activityLogSchema.index({ user: 1, createdAt: 1 });

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

export default ActivityLog;

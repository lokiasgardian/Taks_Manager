import mongoose from 'mongoose';

const todoSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    text: {
      type: String,
      required: [true, 'Task text is required'],
      trim: true,
      maxlength: [200, 'Task text cannot exceed 200 characters'],
    },
    completed: {
      type: Boolean,
      default: false,
    },
    date: {
      type: String,
      required: [true, 'Date is required in YYYY-MM-DD format'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'],
      index: true,
    },
    time: {
      type: String,
      default: '',
      trim: true,
    },
    taskType: {
      type: String,
      enum: ['onetime', 'routine'],
      default: 'onetime',
    },
    routineDuration: {
      type: String,
      enum: ['1_month', '3_months', '6_months', ''],
      default: '',
    },
    routineGroupId: {
      type: String,
      default: null,
      index: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index per user: duplicate task text on the same date for the same user is prevented
todoSchema.index({ user: 1, date: 1, text: 1 }, { unique: true });

const Todo = mongoose.model('Todo', todoSchema);

export default Todo;

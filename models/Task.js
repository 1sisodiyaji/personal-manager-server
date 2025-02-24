const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  status: {
    type: String,
    enum: ['todo', 'doing', 'completed'],
    default: 'todo',
  },
  order: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  startedAt: {
    type: Date,
    default: null,
  },
  completedAt: {
    type: Date,
    default: null,
  },
});

// Middleware to update timestamps when status changes
taskSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    if (this.status === 'doing' && !this.startedAt) {
      this.startedAt = new Date();
    } else if (this.status === 'completed' && !this.completedAt) {
      this.completedAt = new Date();
    }
  }
  next();
});

module.exports = mongoose.model('Task', taskSchema);

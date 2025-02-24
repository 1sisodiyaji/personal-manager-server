const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    prompt: { type: String, required: true },
    text: { type: String, required: true },
    score: { type: Number, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

const Conversation = mongoose.model('Conversation', ConversationSchema);
module.exports = Conversation;

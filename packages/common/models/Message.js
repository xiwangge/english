import mongoose from 'mongoose';

const ReplySchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now }
});

const VoteSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  voteType: { type: String, enum: ['up', 'down'], required: true }
});

const MessageSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, trim: true },
  messageType: { type: String, enum: ['message', 'proposal'], default: 'message' },
  status: { type: String, enum: ['pending', 'approved', 'received', 'rejected', 'closed'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  replies: [ReplySchema],
  votes: [VoteSchema],
  voteDeadline: { type: Date }
});

export default mongoose.model('Message', MessageSchema);
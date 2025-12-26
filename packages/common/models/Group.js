import mongoose from 'mongoose';

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  slogan: {
    type: String,
    trim: true
  },
  avatar: {
    type: String,
    default: 'team_1.png' 
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true 
});

// 虚拟字段，用于动态计算群组总学分
groupSchema.virtual('totalCredits').get(function() {
  if (this.members && this.members.length > 0) {
    return this.members.reduce((total, member) => total + (member.credits || 0), 0);
  }
  return 0;
});

// 确保在 toJSON 和 toObject 时也包含虚拟字段
groupSchema.set('toJSON', { virtuals: true });
groupSchema.set('toObject', { virtuals: true });

const Group = mongoose.model('Group', groupSchema);

export default Group;
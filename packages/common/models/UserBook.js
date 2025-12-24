import mongoose from 'mongoose';

const UserBookSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  bookId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  units: [{
    unitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book.units', required: true },
    completed: {
      type: Boolean,
      default: false
    }
  }]
});

export default mongoose.model('UserBook', UserBookSchema);
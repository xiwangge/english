import mongoose from 'mongoose';

const textbookSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  }
});

const Textbook = mongoose.model('Textbook', textbookSchema);

export default Textbook;
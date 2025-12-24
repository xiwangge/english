import mongoose from 'mongoose';

const WordSchema = new mongoose.Schema({
    text: { type: String, required: true, trim: true, unique: true, sparse: true },
    chinese: { type: String, trim: true },
    phonetic: { type: String, trim: true },
    speakUrl: { type: String, trim: true }
});

export default mongoose.model('Word', WordSchema);
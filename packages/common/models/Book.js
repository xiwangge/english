// models/Book.js
import mongoose from 'mongoose';

const SentenceSchema = new mongoose.Schema({
    text: { type: String, trim: true },
    chinese: { type: String, trim: true },
    speakUrl: { type: String, trim: true },
    words: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Word' }]
});

const UnitSchema = new mongoose.Schema({
    unit: { type: String, required: true, trim: true }, // 单元 (如: Unit 1)
    words: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Word' }],
    sentences: [SentenceSchema]
});

const BookSchema = new mongoose.Schema({
    bookName: { type: String, required: true, trim: true },
    edition: { type: String, required: true, trim: true },
    publisher: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    coverImage: { type: String, trim: true },
    isFree: { type: Boolean, default: false },
    isOnShelf: { type: Boolean, default: true }, // 上架/下架
    studyTime: { type: Number, default: 0 }, // 学习时间
    credits: { type: Number, default: 0 }, // 学分
    units: [UnitSchema]
});

export default mongoose.model('Book', BookSchema);

import mongoose from 'mongoose';

const voiceTeacherSchema = new mongoose.Schema({
    name: { type: String, required: true }, // 老师姓名
    pathDir: { type: String, required: true, unique: true }, // 路径目录，例如 'teacher_a'
    avatar: { type: String }, // 老师头像图片 URL
    exampleSentence: { type: String }, // 发音例句
    description: { type: String }, // 老师简介
    isActive: { type: Boolean, default: true } // 是否启用
}, { timestamps: true, collection: 'voice_teachers' });

const VoiceTeacher = mongoose.model('VoiceTeacher', voiceTeacherSchema);

export default VoiceTeacher;

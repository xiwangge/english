import mongoose from 'mongoose';
import Word from '@english-learning/common/models/Word.js';

// 获取数据库连接字符串，默认使用本地连接
const mongoURI = process.env.mongoURI || 'mongodb://localhost:27017/english-learning';

async function main() {
    try {
        console.log(`正在连接数据库: ${mongoURI}...`);
        await mongoose.connect(mongoURI);
        console.log('数据库连接成功。\n');

        // 查询音标为 'N/A' 的单词
        const naWords = await Word.find({ phonetic: 'N/A' });

        if (naWords.length === 0) {
            console.log('✅ 未发现音标为 N/A 的单词。');
        } else {
            console.log(`🔍 发现 ${naWords.length} 个音标为 N/A 的单词：`);
            console.log('----------------------------------------');
            naWords.forEach((word, index) => {
                console.log(`${index + 1}. ${word.text}`);
            });
            console.log('----------------------------------------');
        }

    } catch (error) {
        console.error('运行过程中发生错误:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n数据库连接已断开。');
        process.exit(0);
    }
}

main();

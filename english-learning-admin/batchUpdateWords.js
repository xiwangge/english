import mongoose from 'mongoose';
import Word from '@english-learning/common/models/Word.js';
import { getChineseFromCEDICT } from './utils.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 如果环境变量中没有 mongoURI，请在此处手动指定或确保运行环境已设置
const mongoURI = process.env.mongoURI || 'mongodb://localhost:27017/english-learning';

async function batchUpdate() {
    try {
        console.log('正在连接 MongoDB...');
        await mongoose.connect(mongoURI);
        console.log('数据库连接成功。');

        // 获取所有单词
        const words = await Word.find({});
        console.log(`共有 ${words.length} 个单词待处理。`);

        let updatedCount = 0;
        let skipCount = 0;

        for (let i = 0; i < words.length; i++) {
            const wordRecord = words[i];
            const oldChinese = wordRecord.chinese;

            // 使用最新的 getChineseFromCEDICT 方法获取翻译
            // 该方法内部已包含：
            // 1. 过滤生僻字（如果使用了清洗后的词典）
            // 2. 限制最多 5 个词义
            const newChinese = getChineseFromCEDICT(wordRecord.text);
            if (newChinese !== 'N/A' && newChinese !== oldChinese) {
                wordRecord.chinese = newChinese;
                await wordRecord.save();
                updatedCount++;
            } else {
                skipCount++;
            }

            // 每 100 条打印一次进度
            if ((i + 1) % 100 === 0) {
                console.log(`进度: ${i + 1}/${words.length} (已更新: ${updatedCount}, 跳过: ${skipCount})`);
            }
        }

        console.log(`\n处理完成!`);
        console.log(`总计: ${words.length}`);
        console.log(`更新成功: ${updatedCount}`);
        console.log(`未变更/不匹配: ${skipCount}`);

    } catch (error) {
        console.error('批量更新过程中出现错误:', error);
    } finally {
        await mongoose.disconnect();
        console.log('数据库连接已断开。');
    }
}

batchUpdate();

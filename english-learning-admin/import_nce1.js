import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Book from '@english-learning/common/models/Book.js';
import Word from '@english-learning/common/models/Word.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * NCE1 LRC 导入脚本
 * 用法: source ../env.sh && node import_nce1.js
 */

async function main() {
    const mongoURI = process.env.mongoURI;
    if (!mongoURI) {
        console.error('❌ 错误: 未找到环境变量 mongoURI，请执行 source ../env.sh');
        process.exit(1);
    }

    try {
        await mongoose.connect(mongoURI);
        console.log('✅ 数据库连接成功');

        const bookName = '新概念英语1';
        let book = await Book.findOne({ bookName });

        if (!book) {
            console.log(`ℹ️ 未找到书籍 "${bookName}"，正在创建新书籍...`);
            book = new Book({
                bookName,
                edition: '美音版',
                publisher: '外研社',
                description: '新概念英语第一册',
                isFree: false,
                isOnShelf: true,
                units: []
            });
        }

        const lrcDir = path.join(__dirname, 'NCE1');
        const files = fs.readdirSync(lrcDir)
            .filter(f => f.endsWith('.lrc'))
            .sort((a, b) => {
                const numA = parseInt(a.match(/^\d+/)?.[0] || 0);
                const numB = parseInt(b.match(/^\d+/)?.[0] || 0);
                return numA - numB;
            });

        console.log(`🚀 发现 ${files.length} 个 LRC 文件，准备开始导入...`);

        let currentUnitNumber = 4; // 从 Unit 4 开始

        for (const file of files) {
            const filePath = path.join(lrcDir, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            const lines = content.split('\n').map(l => l.trim()).filter(l => l !== '');

            if (lines.length < 9) {
                console.warn(`⚠️ 文件 ${file} 行数不足，跳过`);
                continue;
            }

            // 1. 处理标题 (第6行，索引为 5)
            // 格式: [00:02.58]Are you a teacher?
            const rawTitle = lines[5].replace(/^\[\d{2}:\d{2}\.\d{2}\]/, '').trim();
            const unitTitle = `Unit ${currentUnitNumber} ${rawTitle}`;

            // 2. 处理句子 (第9行到最后)
            const sentencesData = [];
            for (let i = 8; i < lines.length; i++) {
                const text = lines[i].replace(/^\[\d{2}:\d{2}\.\d{2}\]/, '').trim();
                if (!text) continue;

                // 拆分单词并保存
                const wordIds = [];
                const wordsInSentence = text.split(/\s+/).map(w => w.replace(/[.,?!]/g, ''));
                for (const wordText of wordsInSentence) {
                    if (!wordText) continue;
                    let wordDoc = await Word.findOne({ text: wordText });
                    if (!wordDoc) {
                        wordDoc = new Word({ text: wordText });
                        await wordDoc.save();
                    }
                    wordIds.push(wordDoc._id);
                }

                sentencesData.push({
                    text: text,
                    words: wordIds
                });
            }

            // 3. 检查是否已包含该单元
            const existingIndex = book.units.findIndex(u => u.unit === unitTitle);
            if (existingIndex > -1) {
                console.log(`⏭️ 单元已存在，更新内容: ${unitTitle}`);
                book.units[existingIndex].sentences = sentencesData;
            } else {
                console.log(`➕ 新增单元: ${unitTitle}`);
                book.units.push({
                    unit: unitTitle,
                    sentences: sentencesData,
                    words: [] // 单词列表可以后续通过 batchUpdate 生成
                });
            }

            currentUnitNumber++;
        }

        await book.save();
        console.log('\n✨ NCE1 导入任务圆满完成！');
        process.exit(0);

    } catch (err) {
        console.error('💥 导入失败:', err);
        process.exit(1);
    }
}

main();

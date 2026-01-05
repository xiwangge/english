import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Book from '@english-learning/common/models/Book.js';
import Word from '@english-learning/common/models/Word.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * NCE2 LRC 导入脚本
 * 用法: source ../env.sh && node import_nce2.js
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

        const bookName = '新概念英语4';
        let book = await Book.findOne({ bookName });

        if (!book) {
            console.log(`ℹ️ 未找到书籍 "${bookName}"，正在创建新书籍...`);
            book = new Book({
                bookName,
                edition: '美音版',
                publisher: '外研社',
                description: '新概念英语第二册',
                isFree: false,
                isOnShelf: true,
                units: []
            });
        }

        const lrcDir = path.join(__dirname, 'NCE4');
        if (!fs.existsSync(lrcDir)) {
            console.error(`❌ 错误: 目录 ${lrcDir} 不存在`);
            process.exit(1);
        }

        const files = fs.readdirSync(lrcDir)
            .filter(f => f.endsWith('.lrc'))
            .sort((a, b) => {
                const numA = parseInt(a.match(/^\d+/)?.[0] || 0);
                const numB = parseInt(b.match(/^\d+/)?.[0] || 0);
                return numA - numB;
            });

        console.log(`🚀 发现 ${files.length} 个 LRC 文件，准备开始导入...`);

        let currentUnitNumber = 1; // 从 Unit 1 开始

        for (const file of files) {
            const filePath = path.join(lrcDir, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            const lines = content.split('\n').map(l => l.trim()).filter(l => l !== '');

            if (lines.length < 6) {
                console.warn(`⚠️ 文件 ${file} 行数不足 (至少需要6行)，跳过`);
                continue;
            }

            // 1. 处理标题 (第3行，索引为 2)
            // 格式: [ti:Breakfast or Lunch?]
            let rawTitle = lines[2].match(/\[ti:(.+)\]/);
            rawTitle = rawTitle ? rawTitle[1].trim() : lines[2].replace(/^\[ti:/, '').replace(/\]$/, '').trim();
            const unitTitle = `Unit ${currentUnitNumber} ${rawTitle}`;

            // 2. 处理句子 (第6行到最后，索引从 5 开始)
            const sentencesData = [];
            for (let i = 7; i < lines.length; i++) {
                // 去除可能存在的时间戳 [00:15.91]
                const text = lines[i].replace(/^\[\d{2}:\d{2}\.\d{2}\]/, '').trim();
                if (!text) continue;

                // 拆分单词并保存 (逻辑与 NCE1 保持一致)
                const wordIds = [];
                // 简单的分词处理，去除常见标点
                const wordsInSentence = text.split(/\s+/).map(w => w.replace(/[.,?!'":;()]/g, ''));
                for (const wordText of wordsInSentence) {
                    if (!wordText || wordText.length < 1) continue;
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

            // 3. 更新或新增单元
            const existingIndex = book.units.findIndex(u => u.unit === unitTitle);
            if (existingIndex > -1) {
                console.log(`⏭️ 单元已存在，更新内容: ${unitTitle}`);
                book.units[existingIndex].sentences = sentencesData;
            } else {
                console.log(`➕ 新增单元: ${unitTitle}`);
                book.units.push({
                    unit: unitTitle,
                    sentences: sentencesData,
                    words: []
                });
            }

            currentUnitNumber++;
        }

        await book.save();
        console.log('\n✨ NCE4 导入任务圆满完成！');
        process.exit(0);

    } catch (err) {
        console.error('💥 导入失败:', err);
        process.exit(1);
    }
}

main();

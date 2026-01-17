import mongoose from 'mongoose';
import Book from '@english-learning/common/models/Book.js';
import fetch from 'node-fetch';
import fs from 'fs';

// 配置
const mongoURI = process.env.mongoURI || 'mongodb://localhost:27017/english-learning';
const assetsUrl = 'https://assets.xuebubu.com/mp3/';
const createSentenceMp3 = 'http://43.173.248.180:3000/synthesize/sentence';
const LOG_FILE = 'sentence_audio_updates.txt';

async function main() {
    try {
        console.log(`正在连接数据库: ${mongoURI}...`);
        await mongoose.connect(mongoURI);
        console.log('数据库连接成功。');

        const books = await Book.find();
        console.log(`找到 ${books.length} 本书籍待处理。`);

        const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });

        for (const book of books) {
            let bookModified = false;
            let unitIndex = 0;
            // --- 统一逻辑：将计数器提到单元循环外面，确保整本书编号连续 ---
            let updatedSentenceCount = 0;

            console.log(`\n>>> 正在处理: ${book.bookName} (ID: ${book._id})`);

            for (const unit of book.units) {
                for (const sentence of unit.sentences) {

                    // 补救逻辑：检查 speakUrl 是否为空或为 'N/A'
                    if (!sentence.speakUrl || sentence.speakUrl.trim() === '' || sentence.speakUrl === 'N/A') {
                        console.log(sentence.text + ' speakUrl 为空 ' + sentence.speakUrl);
                        // 文件名规则严格对齐 adminRoutes.js
                        const filename = `${book._id}-${unitIndex}-${updatedSentenceCount}`;

                        console.log(`  [Unit ${unitIndex}] 尝试生成音频: "${sentence.text.substring(0, 30)}..." (ID: ${updatedSentenceCount})`);

                        try {
                            const response = await fetch(createSentenceMp3, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    sentence: sentence.text,
                                    filename: filename
                                })
                            });

                            if (response.ok) {
                                // 成功后设置 URL
                                sentence.speakUrl = assetsUrl + filename + '.mp3';
                                bookModified = true;

                                // 按格式记录到 txt 文本
                                const logEntry = `${sentence.text}|${sentence.speakUrl}\n`;
                                logStream.write(logEntry);

                                console.log(`    ✅ 成功: ${sentence.speakUrl}`);
                            } else {
                                const errorText = await response.text();
                                console.error(`    ❌ 失败: ${response.status} - ${errorText}`);
                            }
                        } catch (err) {
                            console.error(`    ⚠️ 请求异常: ${err.message}`);
                        }

                        // 每次处理完（无论成功失败）都自增，以保持与系统扫描位次同步
                        updatedSentenceCount++;

                        // 稍作延迟限制频率
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                }
                unitIndex++; // 单元循环增加
            }

            if (bookModified) {
                await book.save();
                console.log(`  [OK] 书籍 "${book.bookName}" 数据已保存。`);
            }
        }

        logStream.end();
        console.log(`\n🎉 全部处理完成！更新清单已存入: ${LOG_FILE}`);

    } catch (error) {
        console.error('运行过程中发生严重错误:', error);
    } finally {
        await mongoose.disconnect();
        console.log('数据库连接已断开。');
    }
}

main();

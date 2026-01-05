import mongoose from 'mongoose';
import Book from '@english-learning/common/models/Book.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 数据库连接 URL
const mongoURI = process.env.mongoURI || 'mongodb://localhost:27017/english-learning';

/**
 * 过滤掉表示对话包裹的单引号，但保留单词内部的单引号（如 he's）
 * @param {string} text 
 * @returns {string}
 */
function cleanQuotedText(text) {
    if (!text) return text;

    // 逻辑：移除所有不属于单词内部的单引号（即表示对话包裹的引号）
    // 使用正则：匹配那些 前面不是字母 或 后面不是字母 的单引号
    // 这样 'Hello' -> Hello, he's -> he's (因为 ' 前后都是字母)

    // 1. 处理在开头或结尾的引号，或者紧邻标点/空格的引号
    // [a-zA-Z] 确保我们只在引号前后至少有一侧不是字母时才进行替换
    let result = text.replace(/(?<![a-zA-Z])'|'(?![a-zA-Z])/g, '');

    // 如果存在一对引号包裹且内部也删干净了，trim 一下
    return result.trim();
}

async function cleanBookSentences() {
    try {
        console.log('正在连接 MongoDB...');
        await mongoose.connect(mongoURI);
        console.log('数据库连接成功。');

        const books = await Book.find({});
        console.log(`正在处理 ${books.length} 本书籍...`);

        let totalUpdatedSentences = 0;
        let totalUpdatedBooks = 0;

        for (const book of books) {
            let bookChanged = false;

            if (!book.units) continue;

            for (let u = 0; u < book.units.length; u++) {
                const unit = book.units[u];
                if (!unit.sentences) continue;

                for (let s = 0; s < unit.sentences.length; s++) {
                    const sentence = unit.sentences[s];
                    console.log(sentence)
                    if (sentence.text && sentence.text.includes("'")) {
                        const originalText = sentence.text;
                        const newText = cleanQuotedText(sentence.text);

                        if (originalText !== newText) {
                            sentence.text = newText;
                            bookChanged = true;
                            totalUpdatedSentences++;
                            // console.log(`[更新] "${originalText}" -> "${newText}"`);
                        }
                    }
                }
            }

            if (bookChanged) {
                // 标记 units 已修改，因为 Mongoose 对嵌套数组的直接修改可能无法自动检测
                book.markModified('units');
                await book.save();
                totalUpdatedBooks++;
                console.log(`书籍 "${book.title}" 更新完成。`);
            }
        }

        console.log(`\n处理完毕！`);
        console.log(`共更新书籍: ${totalUpdatedBooks} 本`);
        console.log(`共清理句子: ${totalUpdatedSentences} 条`);

    } catch (error) {
        console.error('执行过程中出现错误:', error);
    } finally {
        await mongoose.disconnect();
        console.log('数据库连接已断开。');
    }
}

cleanBookSentences();

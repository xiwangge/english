import mongoose from 'mongoose';
import Book from '@english-learning/common/models/Book.js';
import Word from '@english-learning/common/models/Word.js';
import fs from 'fs';

// MongoDB 连接 URI
const mongoURI = process.env.mongoURI || 'mongodb://localhost:27017/english-learning';
const ASSETS_URL_PREFIX = 'https://assets.xuebubu.com/mp3/';

// 辅助函数：延迟
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main(bookName) {
    try {
        console.log(`正在连接 MongoDB: ${mongoURI}...`);
        await mongoose.connect(mongoURI);
        console.log('数据库连接成功。');

        // 根据 bookName 获取书籍，并填充 units 及其对应的 words
        const book = await Book.findOne({ bookName: bookName }).populate('units.words');

        if (!book) {
            console.error(`未找到名为 "${bookName}" 的书籍。`);
            process.exit(1);
        }

        console.log(`找到书籍: ${book.bookName}, 共有 ${book.units.length} 个单元`);

        await exportToFiles(book);

    } catch (error) {
        console.error('执行过程中发生错误:', error);
    } finally {
        await mongoose.disconnect();
        console.log('数据库连接已断开。');
    }
}


async function exportToFiles(book) {
    const wordList = [];
    const sentenceList = [];

    for (const unit of book.units) {
        // 收集单词
        for (const word of unit.words) {
            if (word && word.text) {
                wordList.push(word.text);
            }
        }

        // 收集句子
        for (const sentence of unit.sentences) {
            if (sentence && sentence.text) {
                let filename = '';
                if (sentence.speakUrl) {
                    // 截取掉前缀，并在后缀扩展名前增加 -1 标识
                    filename = sentence.speakUrl
                        .replace(ASSETS_URL_PREFIX, '');
                }
                sentenceList.push(`${sentence.text}|${filename}`);
            }
        }
    }

    // 单词去重
    const uniqueWords = [...new Set(wordList)];

    const wordsFileName = `${book.bookName}_words.txt`;
    const sentencesFileName = `${book.bookName}_sentences.txt`;

    fs.writeFileSync(wordsFileName, uniqueWords.join('\n'), 'utf-8');
    fs.writeFileSync(sentencesFileName, sentenceList.join('\n'), 'utf-8');

    console.log(`\n✅ 导出完成：`);
    console.log(`   - 单词文件: ${wordsFileName} (${uniqueWords.length} 条数据)`);
    console.log(`   - 句子文件: ${sentencesFileName} (${sentenceList.length} 条数据)`);
}


// 从命令行参数获取 bookName 
const args = process.argv.slice(2);
const inputBookName = args[0];

if (!inputBookName) {
    console.log('例如: node generate_gradio_tts.js "新概念英语1" export');
    process.exit(0);
}

main(inputBookName);

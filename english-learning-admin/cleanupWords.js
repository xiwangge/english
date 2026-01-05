import mongoose from 'mongoose';
import Word from '@english-learning/common/models/Word.js';
import Book from '@english-learning/common/models/Book.js';

// 数据库连接 URL
const mongoURI = process.env.mongoURI || 'mongodb://localhost:27017/english-learning';

// 清理函数：去除两端标点，保留中间标点
function getCleanText(text) {
    if (!text) return '';
    return text.replace(/^[.,?!:;：' "()\[\]{}]+|[.,?!:;：' "()\[\]{}]+$/g, '').trim();
}

async function cleanupDirtyWords() {
    try {
        console.log('正在连接 MongoDB...');
        await mongoose.connect(mongoURI);
        console.log('数据库连接成功。');

        // 查找包含特殊符号开头的单词 (模仿用户提供的正则)
        const dirtyWords = await Word.find({
            $or: [
                { text: /^[.,?!:;：' "()\[\]{}]/ },
                { text: /[.,?!:;：' "()\[\]{}]$/ }
            ]
        });

        console.log(`发现 ${dirtyWords.length} 条疑似“脏”数据。`);

        let mergedCount = 0;
        let renamedCount = 0;
        let deletedCount = 0;

        for (const dirtyWord of dirtyWords) {
            const cleanText = getCleanText(dirtyWord.text);

            if (!cleanText) {
                // 如果清理后变为空字符串，直接删除（通常不会发生，除非单词全是符号）
                await Word.deleteOne({ _id: dirtyWord._id });
                deletedCount++;
                continue;
            }

            if (cleanText === dirtyWord.text) {
                continue; // 已经是干净的
            }

            // 检查干净的单词是否已存在
            let existingWord = await Word.findOne({ text: cleanText });

            if (existingWord) {
                // 如果已存在干净的单词，需要：
                // 1. 将所有引用 dirtyWord._id 的 Book 记录更新为引用 existingWord._id

                // 处理 Book 中的 units.words 数组
                await Book.updateMany(
                    { 'units.words': dirtyWord._id },
                    { $set: { 'units.words.$[elem]': existingWord._id } },
                    { arrayFilters: [{ 'elem': dirtyWord._id }] }
                );

                // 处理 Book 中的 units.sentences.words 数组
                // 注意：Mongoose 处理嵌套数组的 updateMany 比较复杂，我们分两步处理

                const booksWithSentenceWord = await Book.find({ 'units.sentences.words': dirtyWord._id });
                for (const book of booksWithSentenceWord) {
                    let changed = false;
                    book.units.forEach(unit => {
                        unit.sentences.forEach(sentence => {
                            if (sentence.words && sentence.words.includes(dirtyWord._id)) {
                                sentence.words = sentence.words.map(id =>
                                    id.toString() === dirtyWord._id.toString() ? existingWord._id : id
                                );
                                changed = true;
                            }
                        });
                    });
                    if (changed) {
                        book.markModified('units');
                        await book.save();
                    }
                }

                // 2. 删除重复的脏单词
                await Word.deleteOne({ _id: dirtyWord._id });
                mergedCount++;
                console.log(`[合并] "${dirtyWord.text}" -> "${existingWord.text}"`);
            } else {
                // 如果不存在干净的单词，直接更新脏单词的 text
                try {
                    dirtyWord.text = cleanText;
                    await dirtyWord.save();
                    renamedCount++;
                    console.log(`[修正] "${dirtyWord.text}" 原为包含符号`);
                } catch (err) {
                    // 如果因为某种原因报错（比如刚好并发产生了一个），则跳过
                    console.error(`修正 "${dirtyWord.text}" 失败:`, err.message);
                }
            }
        }

        console.log(`\n清理完成!`);
        console.log(`合并重复项: ${mergedCount}`);
        console.log(`直接更名项: ${renamedCount}`);
        console.log(`删除无效项: ${deletedCount}`);

    } catch (error) {
        console.error('执行过程中出现错误:', error);
    } finally {
        await mongoose.disconnect();
        console.log('数据库连接已断开。');
    }
}

cleanupDirtyWords();

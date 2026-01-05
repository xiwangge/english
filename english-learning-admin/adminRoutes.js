import express from 'express';
import multer from 'multer';
import { getPhoneticLocal, getPhoneticFromDictAPI, getChineseFromYoudao, getChineseFromCEDICT } from './utils.js';
import path from 'path';
// import fs from 'fs';
import { fileURLToPath } from 'url';

import Message from '@english-learning/common/models/Message.js';
import User from '@english-learning/common/models/User.js';
import Book from '@english-learning/common/models/Book.js';
import Word from '@english-learning/common/models/Word.js';
import Product from '@english-learning/common/models/Product.js';
import Order from '@english-learning/common/models/Order.js';
import SystemConfig from '@english-learning/common/models/SystemConfig.js';
import WithdrawalRequest from '@english-learning/common/models/WithdrawalRequest.js';
import COS from 'cos-nodejs-sdk-v5';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

const assetsUrl = 'https://assets.xuebubu.com/mp3/';
const createWordMp3 = 'http://43.173.248.180:3000/synthesize/word';
const createSentenceMp3 = 'http://43.173.248.180:3000/synthesize/sentence';

// 腾讯云 COS 配置
const cos = new COS({
    SecretId: process.env.COS_SECRET_ID,
    SecretKey: process.env.COS_SECRET_KEY,
});

const cosConfig = {
    Bucket: process.env.COS_BUCKET,
    Region: process.env.COS_REGION,
};

// Multer 配置 - 使用内存存储
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// 获取需要回复的消息
router.get('/messagesNeedRead', async (req, res) => {
    try {
        const messages = await Message.find({ status: { $in: ['approved', 'pending'] } })
            .populate('author', 'nickname avatar')
            .populate('replies.author', 'nickname avatar')
            .sort({ createdAt: -1 });
        res.status(200).json(messages);
    } catch (error) {
        res.status(500).json({ message: '获取留言失败' });
    }
});

// 审核提案
router.patch('/messages/:id/status', async (req, res) => {
    try {
        const token = req.headers.authorization;
        if (token !== 'admin') {
            return res.status(403).json({ message: '无权访问' });
        }
        const { status, voteDeadline } = req.body;
        const message = await Message.findById(req.params.id);
        if (!message) {
            return res.status(404).json({ message: '留言或提案不存在' });
        }

        // Differentiate logic based on messageType
        if (message.messageType === 'proposal') {
            if (status) {
                message.status = status;
            }
            if (status === 'approved' && voteDeadline) {
                message.voteDeadline = voteDeadline;
            }
        } else if (message.messageType === 'message') {
            if (status === 'closed') {
                message.status = status;
            } else {
                // For now, only 'closed' is a valid status update for messages
                return res.status(400).json({ message: '无效的状态更新' });
            }
        } else {
            return res.status(400).json({ message: '未知的消息类型' });
        }

        await message.save();
        res.status(200).json(message);
    } catch (error) {
        res.status(500).json({ message: '审核失败' });
    }
});

// 根据昵称搜索用户
router.get('/users/search', async (req, res) => {
    try {
        // 简单的权限检查
        const token = req.headers.authorization;
        if (token !== 'admin') {
            return res.status(403).json({ message: '无权访问' });
        }
        const { query } = req.query;
        if (!query) {
            return res.status(400).json({ message: '请提供搜索关键词' });
        }
        // 使用正则表达式进行模糊查询，不区分大小写，支持昵称或邮箱
        const users = await User.find({
            $or: [
                { nickname: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } }
            ]
        }).select('nickname email userType credits golds subscriptionExpiry createdAt');
        res.status(200).json(users);
    } catch (error) {
        console.error('搜索用户失败:', error);
        res.status(500).json({ message: '服务器搜索用户失败' });
    }
});

// 更新用户类型
router.patch('/users/:id/userType', async (req, res) => {
    try {
        const token = req.headers.authorization;
        if (token !== 'admin') {
            return res.status(403).json({ message: '无权访问' });
        }
        const { userType } = req.body;
        const userId = req.params.id;

        if (!['user', 'admin', 'support'].includes(userType)) {
            return res.status(400).json({ message: '无效的用户类型' });
        }

        const user = await User.findByIdAndUpdate(userId, { userType }, { new: true });

        if (!user) {
            return res.status(404).json({ message: '用户不存在' });
        }
        res.status(200).json({ message: '用户类型更新成功', user });
    } catch (error) {
        console.error('更新用户类型失败:', error);
        res.status(500).json({ message: '服务器更新用户类型失败' });
    }
});

// 给用户增加订阅天数
router.post('/users/:id/add-subscription', async (req, res) => {
    try {
        const token = req.headers.authorization;
        if (token !== 'admin') {
            return res.status(403).json({ message: '无权访问' });
        }

        const { id } = req.params;
        const { days } = req.body;

        if (!days || isNaN(days)) {
            return res.status(400).json({ message: '请输入有效天数' });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: '用户不存在' });
        }

        // 计算新的到期时间
        const now = new Date();
        const currentExpiry = (user.subscriptionExpiry && user.subscriptionExpiry > now)
            ? user.subscriptionExpiry
            : now;

        const newExpiry = new Date(currentExpiry.getTime() + parseInt(days) * 24 * 60 * 60 * 1000);
        user.subscriptionExpiry = newExpiry;
        await user.save();

        res.status(200).json({ message: '订阅天数增加成功', subscriptionExpiry: user.subscriptionExpiry });
    } catch (error) {
        console.error('增加订阅天数失败:', error);
        res.status(500).json({ message: '服务器增加订阅天数失败' });
    }
});

// --- 新增：获取 COS 预签名 URL ---
router.get('/cos/get-presigned-url', async (req, res) => {
    const { filename } = req.query;
    if (!filename) {
        return res.status(400).json({ message: 'Filename is required.' });
    }

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(filename);
    const key = `images/cover-${uniqueSuffix}${fileExtension}`;

    const params = {
        Bucket: cosConfig.Bucket,
        Region: cosConfig.Region,
        Key: key,
        Method: 'PUT',
        Expires: 600, // 签名有效期 10 分钟
        Sign: true, // 必须设置为 true 来获取预签名 URL
        Headers: {
            'Content-Type': 'image/png' // Or the specific type, but this is a common case
        }
    };

    cos.getObjectUrl(params, (err, data) => {
        if (err) {
            console.error('Error getting presigned URL from COS', err);
            return res.status(500).json({ message: 'Failed to get upload URL.' });
        }
        const accessUrl = process.env.COS_CUSTOM_DOMAIN
            ? `${process.env.COS_CUSTOM_DOMAIN}/${key}`
            : `https://${cosConfig.Bucket}.cos.${cosConfig.Region}.myqcloud.com/${key}`;

        res.status(200).json({
            uploadUrl: data.Url, // 正确的返回字段是 Url
            accessUrl: accessUrl
        });
    });
});


// 创建/更新书籍 (已改造)
// 创建/更新书籍 (已改造，移除后端上传逻辑)
router.post('/book/create', upload.none(), async (req, res) => { // 使用 upload.none() 因为不再处理文件
    try {
        const { bookName, edition, publisher, description, isFree, isOnShelf, studyTime, credits, coverImageUrl } = req.body;

        if (!bookName || !edition || !publisher || !description) {
            return res.status(400).json({ message: '请填写所有书籍基本信息' });
        }

        if (!coverImageUrl) {
            return res.status(400).json({ message: '缺少封面图片 URL' });
        }

        const coverImage = coverImageUrl; // 直接使用前端提供的 URL

        // 查找是否已存在同名书籍
        let book = await Book.findOne({ bookName: bookName });

        if (book) {
            // 如果存在，则更新书籍信息
            book.edition = edition;
            book.publisher = publisher;
            book.description = description;
            book.coverImage = coverImage;
            book.isFree = isFree === 'true';
            book.isOnShelf = isOnShelf === 'true';
            book.studyTime = parseInt(studyTime);
            book.credits = parseInt(credits); // 更新学分

            await book.save();

            res.status(200).json({ message: '书籍更新成功', book });
        } else {
            // 如果不存在，则创建新的书籍
            const newBook = new Book({
                bookName,
                edition,
                publisher,
                description,
                coverImage,
                isFree,
                isOnShelf,
                studyTime,
                credits
            });

            newBook.isFree = isFree === 'true';
            newBook.isOnShelf = isOnShelf === 'true';
            newBook.studyTime = parseInt(studyTime);
            newBook.credits = parseInt(credits); // 添加学分

            // 保存书籍
            await newBook.save();

            res.status(200).json({ message: '书籍创建成功', book: newBook });
        }
    } catch (error) {
        console.error('创建/更新书籍失败:', error);
        res.status(500).json({ message: '服务器创建/更新书籍失败' });
    }
});

const replaceCosDomain = (books) => {
    const customDomain = process.env.COS_CUSTOM_DOMAIN;
    if (!customDomain || !process.env.COS_BUCKET || !process.env.COS_REGION) return books;

    const defaultCosDomain = `https://${process.env.COS_BUCKET}.cos.${process.env.COS_REGION}.myqcloud.com`;

    return books.map(book => {
        const bookObj = book.toObject(); // Convert Mongoose document to plain object
        if (bookObj.coverImage && bookObj.coverImage.startsWith(defaultCosDomain)) {
            bookObj.coverImage = bookObj.coverImage.replace(defaultCosDomain, customDomain);
        }
        return bookObj;
    });
};

// 获取所有书籍 包含下架的
router.get('/book/list', async (req, res) => {
    try {
        const books = await Book.find();
        res.status(200).json(replaceCosDomain(books));
    } catch (error) {
        console.error('获取所有书籍失败:', error);
        res.status(500).json({ message: '服务器获取所有书籍失败' });
    }
});

// 搜索书籍
router.get('/book/search', async (req, res) => {
    try {
        const { bookName } = req.query;
        let query = {};
        if (bookName) {
            query = { bookName: { $regex: bookName, $options: 'i' } };
        }

        const books = await Book.find(query);
        res.status(200).json(replaceCosDomain(books));
    } catch (error) {
        console.error('搜索书籍失败:', error);
        res.status(500).json({ message: '服务器搜索书籍失败' });
    }
});

// 根据 bookId 获取单元列表
router.get('/book/getUints', async (req, res) => {
    try {
        const { bookId } = req.query;
        if (!bookId) {
            return res.status(400).json({ message: 'bookId is required' });
        }

        const book = await Book.findById(bookId).populate('units.words').populate('units.sentences.words');
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }

        res.status(200).json(book.units);
    } catch (error) {
        console.error('获取单元列表失败:', error);
        res.status(500).json({ message: '服务器获取单元列表失败' });
    }
});

// 创建或更新单元
router.post('/book/createUnit', async (req, res) => {
    try {
        const { bookId, units } = req.body;

        if (!bookId || !units || !Array.isArray(units)) {
            return res.status(400).json({ message: '请求参数错误' });
        }

        const book = await Book.findById(bookId);
        if (!book) {
            return res.status(404).json({ message: '书籍未找到' });
        }

        for (const unitData of units) {
            const { uint, words, sentences } = unitData;

            if (!uint || !Array.isArray(words) || !Array.isArray(sentences)) {
                return res.status(400).json({ message: '单元数据错误' });
            }

            // 处理句子，填充 words 数组
            for (const sentence of sentences) {
                // 使用更严谨的正则提取单词：
                // 1. 按空格拆分
                // 2. 去除单词两端的标点符号 (包括 ' " , . ! ? : ; ：等)，保留中间的 (如 he's)
                const sentenceWords = sentence.text.split(/\s+/).map(w =>
                    w.replace(/^[.,?!:;：' "()\[\]{}]+|[.,?!:;：' "()\[\]{}]+$/g, '')
                );
                sentence.words = [];
                for (const wordText of sentenceWords) {
                    const cleanWordText = wordText.trim();
                    if (!cleanWordText) continue; // 跳过空或无效的字符串
                    let word = await Word.findOne({ text: cleanWordText });
                    if (!word) {
                        word = new Word({ text: wordText.trim() });
                        await word.save();
                    }
                    sentence.words.push(word._id);
                }
            }
            // 检查单元是否已存在
            const existingUnitIndex = book.units.findIndex(u => u.unit === uint);

            const wordIds = [];
            for (const wordText of words) {
                const cleanWordText = wordText ? wordText.trim().replace(/^[.,?!:;：' "()\[\]{}]+|[.,?!:;：' "()\[\]{}]+$/g, '') : '';
                if (!cleanWordText) continue; // 跳过空或无效的字符串
                let word = await Word.findOne({ text: cleanWordText });
                if (!word) {
                    word = new Word({ text: cleanWordText });
                    await word.save();
                }
                wordIds.push(word._id);
            }

            if (existingUnitIndex > -1) {
                // 更新现有单元
                book.units[existingUnitIndex].words = wordIds;
                book.units[existingUnitIndex].sentences = sentences;
            } else {
                // 添加新单元
                book.units.push({
                    unit: uint,
                    words: wordIds,
                    sentences: sentences
                });
            }
        }

        await book.save();
        res.status(200).json({ message: '课程内容保存成功!' });
    } catch (error) {
        console.error('保存课程内容失败:', error);
        res.status(500).json({ message: '服务器保存课程内容失败' });
    }
});

router.post('/book/batchUpdateWordsHybrid', async (req, res) => {
    const { bookId } = req.body;
    if (!bookId) {
        return res.status(400).json({ message: 'bookId is required' });
    }

    try {
        // 【重构】深度关联查询，获取完整的 Word 对象
        const book = await Book.findById(bookId).populate('units.words');
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }

        let updatedCount = 0;
        const promises = []; // 用于存储所有 word.save() 的 Promise

        for (const unit of book.units) {
            // unit.words 现在是完整的 Word 对象数组
            for (const word of unit.words) {
                if (!word) continue; // 如果 populate 失败或 ID 无效，则跳过
                let needsUpdate = false;

                // 检查音标
                if (!word.phonetic || word.phonetic === 'N/A') {
                    needsUpdate = true;
                    let phonetic = await getPhoneticLocal(word.text);
                    if (!phonetic || phonetic === 'N/A') {
                        phonetic = await getPhoneticFromDictAPI(word.text);
                        // 为 DictionaryAPI 添加延迟
                        await new Promise(resolve => setTimeout(resolve, 250));
                    }
                    word.phonetic = phonetic;
                }

                // 检查中文
                if (!word.chinese || word.chinese === 'N/A') {
                    needsUpdate = true;

                    // 更新中文
                    let chinese = await getChineseFromCEDICT(word.text);
                    if (!chinese || chinese === 'N/A') {
                        chinese = await getChineseFromYoudao(word.text);
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                    word.chinese = chinese;
                }

                // 更新 speakUrl
                if (!word.speakUrl || word.speakUrl === 'N/A') {
                    needsUpdate = true;
                    try {
                        // 调用 TTS 服务生成音频
                        await fetch(createWordMp3, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ word: word.text })
                        });
                        // 如果成功，则设置 URL
                        word.speakUrl = assetsUrl + 'word/' + word.text + '.mp3';
                    } catch (ttsError) {
                        console.error(`TTS generation failed for word "${word.text}":`, ttsError);
                        word.speakUrl = 'N/A'; // TTS 失败，标记为 N/A
                    }
                }

                if (needsUpdate) {
                    updatedCount++;
                    // 【关键】将每个独立的 word.save() 操作作为一个 Promise 添加到数组中
                    promises.push(word.save());
                }
            }
        }

        if (updatedCount > 0) {
            // 并行执行所有保存操作
            await Promise.all(promises);
            res.status(200).json({ message: `Successfully updated ${updatedCount} words (Hybrid).` });
        } else {
            res.status(200).json({ message: 'No words needed updating.' });
        }

    } catch (error) {
        console.error('Batch update failed:', error);
        res.status(500).json({ message: 'Server error during batch update' });
    }
});

router.post('/book/batchUpdateSentencesHybrid', async (req, res) => {
    const { bookId } = req.body;
    if (!bookId) {
        return res.status(400).json({ message: 'bookId is required' });
    }

    try {
        // 【最终重构】深度关联查询，获取句子中的 Word 对象
        const book = await Book.findById(bookId).populate('units.sentences.words');

        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }

        let updatedWordCount = 0;
        let updatedSentenceCount = 0;
        const promises = [];
        const wordsToUpdate = new Map(); // 使用 Map 避免重复处理同一个单词
        let bookModified = false; // 标记 Book 文档是否需要保存
        let unitIndex = 0;

        // 收集所有需要更新的单词，并直接更新句子
        for (const unit of book.units) {
            for (const sentence of unit.sentences) {
                // 1. 更新句子本身
                if (sentence.text && (!sentence.chinese || sentence.chinese === 'N/A')) {
                    const chinese = await getChineseFromYoudao(sentence.text);
                    sentence.chinese = chinese;
                    console.log(sentence.text + ' ' + sentence.chinese)
                    // 更新 speakUrl
                    if (!sentence.speakUrl || sentence.speakUrl === 'N/A') {
                        const filename = book._id + '-' + unitIndex + '-' + updatedSentenceCount;
                        try {
                            // 调用 TTS 服务生成音频
                            await fetch(createSentenceMp3, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ sentence: sentence.text, filename: filename })
                            });
                            // 如果成功，则设置 URL
                            sentence.speakUrl = assetsUrl + filename + '.mp3';
                        } catch (ttsError) {
                            console.error(`TTS generation failed for word "${sentence.text}":`, ttsError);
                            sentence.speakUrl = 'N/A'; // TTS 失败，标记为 N/A
                        }
                    }

                    updatedSentenceCount++;
                    bookModified = true; // 标记需要保存
                    await new Promise(resolve => setTimeout(resolve, 1000)); // 延迟
                }

                // 2. 收集句子中的单词以供后续更新
                for (const word of sentence.words) {
                    if (word && !wordsToUpdate.has(word._id.toString())) {
                        wordsToUpdate.set(word._id.toString(), word);
                    }
                }
            }
            unitIndex++;
        }

        // 遍历并更新收集到的独立单词
        for (const word of wordsToUpdate.values()) {
            let needsUpdate = false;

            // 更新单词的音标
            if (!word.phonetic || word.phonetic === 'N/A') {
                needsUpdate = true;
                let phonetic = await getPhoneticLocal(word.text);
                if (!phonetic || phonetic === 'N/A') {
                    phonetic = await getPhoneticFromDictAPI(word.text);
                    await new Promise(resolve => setTimeout(resolve, 250));
                }
                word.phonetic = phonetic;
            }

            // 更新单词的中文和发音
            if (!word.chinese || word.chinese === 'N/A') {
                needsUpdate = true;
                let chinese = await getChineseFromCEDICT(word.text);
                if (!chinese || chinese === 'N/A') {
                    chinese = await getChineseFromYoudao(word.text);
                    // 为 youdaoapi 添加延迟
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                word.chinese = chinese;
            }

            if (needsUpdate) {
                updatedWordCount++;
                promises.push(word.save());
            }
        }

        // 如果 Book 文档被修改过，则将其保存操作添加到 Promise 队列
        if (bookModified) {
            promises.push(book.save());
        }

        if (promises.length > 0) {
            await Promise.all(promises);
            let message = `Update complete.`;
            if (updatedSentenceCount > 0) message += ` ${updatedSentenceCount} sentences updated.`;
            if (updatedWordCount > 0) message += ` ${updatedWordCount} words from sentences updated.`;
            res.status(200).json({ message });
        } else {
            res.status(200).json({ message: 'No sentences or words needed updating.' });
        }

    } catch (error) {
        console.error('Batch update sentences failed:', error);
        res.status(500).json({ message: 'Server error during batch update' });
    }
});



// --- 系统配置管理 API ---

// 获取系统配置
router.get('/system-config', async (req, res) => {
    try {
        const { key } = req.query;
        if (key) {
            const config = await SystemConfig.findOne({ key });
            return res.status(200).json(config);
        }
        const configs = await SystemConfig.find();
        res.status(200).json(configs);
    } catch (error) {
        console.error('获取系统配置失败:', error);
        res.status(500).json({ message: '服务器获取系统配置失败' });
    }
});

// 设置系统配置
router.post('/system-config', async (req, res) => {
    try {
        const token = req.headers.authorization;
        if (token !== 'admin') {
            return res.status(403).json({ message: '无权访问' });
        }
        const { key, value, description } = req.body;
        if (!key || value === undefined) {
            return res.status(400).json({ message: '缺少 key 或 value' });
        }

        const config = await SystemConfig.findOneAndUpdate(
            { key },
            { value, description },
            { new: true, upsert: true }
        );

        res.status(200).json({ message: '配置保存成功', config });
    } catch (error) {
        console.error('保存系统配置失败:', error);
        res.status(500).json({ message: '服务器保存系统配置失败' });
    }
});


// --- 订单管理 API ---

// 获取/搜索订单
router.get('/orders', async (req, res) => {
    try {
        const token = req.headers.authorization;
        if (token !== 'admin') {
            return res.status(403).json({ message: '无权访问' });
        }

        const { orderNo, transactionId, status, query } = req.query;
        let filter = {};

        if (orderNo) filter.orderNo = orderNo;
        if (transactionId) filter.transactionId = transactionId;
        if (status) filter.status = status;

        if (query) {
            // 支持通过邮箱或昵称搜索关联用户
            const users = await User.find({
                $or: [
                    { email: { $regex: query, $options: 'i' } },
                    { nickname: { $regex: query, $options: 'i' } }
                ]
            }).select('_id');
            const userIds = users.map(u => u._id);
            filter.userId = { $in: userIds };
        }

        const orders = await Order.find(filter)
            .populate('userId', 'nickname email')
            .populate('productId', 'name')
            .sort({ createdAt: -1 })
            .limit(100);

        res.status(200).json(orders);
    } catch (error) {
        console.error('获取订单失败:', error);
        res.status(500).json({ message: '服务器获取订单失败' });
    }
});
// --- 单词管理 API ---

// 搜索单词
router.get('/words/search', async (req, res) => {
    try {
        const token = req.headers.authorization;
        if (token !== 'admin') return res.status(403).json({ message: '无权访问' });

        const { query } = req.query;
        if (!query) return res.json([]);

        // 支持模糊搜索
        const words = await Word.find({
            text: { $regex: query, $options: 'i' }
        }).limit(50);

        res.status(200).json(words);
    } catch (error) {
        console.error('搜索单词失败:', error);
        res.status(500).json({ message: '搜索单词失败' });
    }
});

// 更新单词信息
router.post('/words/update', async (req, res) => {
    try {
        const token = req.headers.authorization;
        if (token !== 'admin') return res.status(403).json({ message: '无权访问' });

        const { id, chinese, phonetic } = req.body;
        if (!id) return res.status(400).json({ message: '缺少单词ID' });

        const word = await Word.findByIdAndUpdate(id, { chinese, phonetic }, { new: true });

        if (!word) return res.status(404).json({ message: '单词不存在' });
        res.status(200).json(word);
    } catch (error) {
        console.error('更新单词失败:', error);
        res.status(500).json({ message: '更新单词失败' });
    }
});

// --- 提现管理 API ---

// 获取提现申请列表
router.get('/withdrawals', async (req, res) => {
    try {
        const token = req.headers.authorization;
        if (token !== 'admin') return res.status(403).json({ message: '无权访问' });

        const { status, query } = req.query;
        let filter = {};
        if (status) filter.status = status;

        if (query) {
            const users = await User.find({
                $or: [
                    { email: { $regex: query, $options: 'i' } },
                    { nickname: { $regex: query, $options: 'i' } }
                ]
            }).select('_id');
            filter.userId = { $in: users.map(u => u._id) };
        }

        const requests = await WithdrawalRequest.find(filter)
            .populate('userId', 'nickname email balance')
            .sort({ createdAt: -1 });

        res.json(requests);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: '获取提现申请失败' });
    }
});

// 更新提现申请状态
router.post('/withdrawals/update', async (req, res) => {
    try {
        const token = req.headers.authorization;
        if (token !== 'admin') return res.status(403).json({ message: '无权访问' });

        const { id, status, adminNotes } = req.body;
        const request = await WithdrawalRequest.findById(id);
        if (!request) return res.status(404).json({ message: '申请不存在' });

        // 如果拒绝申请，返还余额
        if (status === 'rejected' && request.status !== 'rejected' && request.status !== 'completed') {
            const user = await User.findById(request.userId);
            if (user) {
                user.balance += request.amount;
                await user.save();
            }
        }

        request.status = status;
        request.adminNotes = adminNotes;
        request.processedAt = new Date();
        await request.save();

        res.json({ message: '状态已更新' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: '更新失败' });
    }
});

// 获取看板统计数据
router.get('/dashboard-stats', async (req, res) => {
    try {
        const token = req.headers.authorization;
        if (token !== 'admin') {
            return res.status(403).json({ message: '无权访问' });
        }

        // 1. 用户总数
        const totalUsers = await User.countDocuments();

        // 2. 付费用户总数 (有过订阅记录)
        const payingUsers = await User.countDocuments({ subscriptionType: { $ne: null } });

        // 3. 当前在订阅期内的用户总数
        const activeSubscribers = await User.countDocuments({ subscriptionExpiry: { $gte: new Date() } });

        // 4. 新增用户和日期的曲线数据
        const newUserTrends = await User.aggregate([
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { _id: 1 } // 按日期升序排序
            },
            {
                $project: {
                    date: "$_id",
                    count: "$count",
                    _id: 0
                }
            }
        ]);

        res.status(200).json({
            totalUsers,
            payingUsers,
            activeSubscribers,
            newUserTrends
        });

    } catch (error) {
        console.error('获取看板数据时发生严重错误:', error); // 更详细的日志
        res.status(500).json({ message: '服务器获取看板数据失败', error: error.message });
    }
});

// --- 产品/价格管理 API ---

// 获取所有产品信息
router.get('/products', async (req, res) => {
    try {
        const products = await Product.find().sort({ price: 1 });
        res.status(200).json(products);
    } catch (error) {
        console.error('获取产品信息失败:', error);
        res.status(500).json({ message: '服务器获取产品信息失败' });
    }
});

// 更新产品价格
router.post('/products/update', async (req, res) => {
    try {
        const token = req.headers.authorization;
        if (token !== 'admin') {
            return res.status(403).json({ message: '无权访问' });
        }
        const { products } = req.body; // products 是一个包含多个产品对象的数组
        if (!Array.isArray(products)) {
            return res.status(400).json({ message: '无效的数据格式' });
        }

        const promises = products.map(p =>
            Product.findOneAndUpdate(
                { type: p.type },
                { price: p.price, stripePriceId: p.stripePriceId },
                { new: true, upsert: false } // 不创建新品种
            )
        );

        await Promise.all(promises);

        res.status(200).json({ message: '产品信息更新成功' });

    } catch (error) {
        console.error('更新产品价格失败:', error);
        res.status(500).json({ message: '服务器更新产品价格失败' });
    }
});

export default router;

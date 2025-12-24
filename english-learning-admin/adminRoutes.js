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
import COS from 'cos-nodejs-sdk-v5';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

const assetsUrl = 'https://www.xuebubu.com/mp3/';
const createWordMp3 = 'http://43.173.248.180:3000/synthesize/word';
const createSentenceMp3 = 'http://43.173.248.180:3000/synthesize/sentence';

// 腾讯云 COS 配置
const cos = new COS({
    SecretId: '', // 留空，由用户填写
    SecretKey: '', // 留空，由用户填写
});

const cosConfig = {
    Bucket: 'your-bucket-name', // 替换为你的 Bucket 名称
    Region: 'ap-guangzhou',      // 替换为你的 Bucket 所在地域
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
    if(token !== 'admin') {
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
    const { nickname } = req.query;
    if (!nickname) {
      return res.status(400).json({ message: '请提供昵称' });
    }
    // 使用正则表达式进行模糊查询，不区分大小写
    const users = await User.find({ nickname: { $regex: nickname, $options: 'i' } }).select('nickname userType');
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

// 创建书籍
router.post('/book/create', upload.single('cover'), async (req, res) => {
    try {
        const { bookName, edition, publisher, description, isFree, isOnShelf, studyTime, credits } = req.body;
        const cover = req.file;

        if (!bookName || !edition || !publisher || !description || !cover) {
            return res.status(400).json({ message: '请填写所有信息并上传封面' });
        }

        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExtension = path.extname(cover.originalname);
        const filename = `cover-${uniqueSuffix}${fileExtension}`;

        await new Promise((resolve, reject) => {
            cos.putObject({
                Bucket: cosConfig.Bucket,
                Region: cosConfig.Region,
                Key: `images/${filename}`,
                Body: cover.buffer,
            }, (err, data) => {
                if (err) {
                    return reject(err);
                }
                resolve(data);
            });
        });

        const coverImage = `https://${cosConfig.Bucket}.cos.${cosConfig.Region}.myqcloud.com/images/${filename}`;

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
// 获取所有书籍 包含下架的
router.get('/book/list', async (req, res) => {
    try {
        const books = await Book.find();
        if(books) {
          res.status(200).json(books);
        }
        
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
        res.status(200).json(books);
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
                const sentenceWords = sentence.text.split(' ').map(w => w.replace(/[.,?!]/g, ''));
                sentence.words = [];
                for (const wordText of sentenceWords) {
                    if (!wordText || wordText.trim() === '') continue; // 跳过空或无效的字符串
                    let word = await Word.findOne({ text: wordText.trim() });
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
                if (!wordText || wordText.trim() === '') continue; // 跳过空或无效的字符串
                let word = await Word.findOne({ text: wordText.trim() });
                if (!word) {
                    word = new Word({ text: wordText.trim() });
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
                        word.speakUrl = assetsUrl + '/word' + word.text + '.mp3';
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

                    // 更新 speakUrl
                    if (!sentence.speakUrl || sentence.speakUrl === 'N/A') {
                        const filename = book._id + '-' + unitIndex + '-' + updatedSentenceCount ;
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
            unitIndex ++;
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


export default router;
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
                { price: p.price },
                { new: true, upsert: false } // 不创建新品种
            )
        );

        await Promise.all(promises);

        res.status(200).json({ message: '价格更新成功' });

    } catch (error) {
        console.error('更新产品价格失败:', error);
        res.status(500).json({ message: '服务器更新产品价格失败' });
    }
});

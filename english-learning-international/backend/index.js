import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import WXPay from 'wechatpay-node-v3';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import solarlunar from 'solarlunar';
import ip2region from 'ip2region';
import Stripe from 'stripe';
const Searcher = ip2region.default || ip2region;

// Import common models
import Product from '@english-learning/common/models/Product.js';
import Order from '@english-learning/common/models/Order.js';
import User from '@english-learning/common/models/User.js';
import EmailVerification from '@english-learning/common/models/EmailVerification.js';
import Message from '@english-learning/common/models/Message.js';
import Group from '@english-learning/common/models/Group.js';
import SystemConfig from '@english-learning/common/models/SystemConfig.js';
import { Resend } from 'resend';
import DM20151123, * as $DM20151123 from '@alicloud/dm20151123';
import * as $OpenApi from '@alicloud/openapi-client';

const resend = new Resend(process.env.EMAIL_RESEND);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
// 月度 price_1SlquVRv2dHZgmnc5kWaEPBl.   prod_TjJX4aoSBPSKLM
// 季度 订阅 price_1Slr1yRv2dHZgmnc7NS7gDTr
// 季度price_1SlsE4Rv2dHZgmncqfZRKZ5f     prod_TjKt5ueOiS4Ktd
// 年度 price_1Slr4pRv2dHZgmncWDchY4p4    prod_TjJim5lZpIosri
// 终身 price_1SlsHzRv2dHZgmncPq8IzS1W    prod_TjKxegE7gjoXt7

// 初始化客户端
const clientConfig = new $OpenApi.Config({
    accessKeyId: process.env.EMAIL_ALI_KEY_ID,
    accessKeySecret: process.env.EMAIL_ALI_KEY_SECRET,
    endpoint: 'dm.aliyuncs.com', // API端点
    regionId: 'cn-hangzhou',
});
// ESM 下通常直接使用 DM20151123 或 DM20151123.default
const dmClient = new (DM20151123.default || DM20151123)(clientConfig);


const searcher = new Searcher({ dbPath: path.join(path.dirname(fileURLToPath(import.meta.url)), 'ip2region_v4.xdb') });

// --- Basic Setup ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = 5001;

app.use(cors());

// Stripe webhook must be before express.json() for raw body access
app.post('/api/payment/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error('Stripe Webhook Signature Verification Failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const userId = session.client_reference_id;
        const productType = session.metadata.productType;

        try {
            const [user, product] = await Promise.all([
                User.findById(userId),
                Product.findOne({ type: productType })
            ]);

            if (user && product) {
                let days = 0;
                if (productType === 'monthly') days = 31;
                else if (productType === 'quarterly') days = 93;
                else if (productType === 'yearly') days = 366;
                else if (productType === 'lifetime') days = 36500;

                const current = (user.subscriptionExpiry && user.subscriptionExpiry > new Date())
                    ? user.subscriptionExpiry
                    : new Date();
                user.subscriptionExpiry = new Date(current.getTime() + days * 24 * 60 * 60 * 1000);

                const order = new Order({
                    orderNo: session.id,
                    userId: userId,
                    productId: product._id, // 修复：添加必须的产品 ID
                    amount: session.amount_total / 100,
                    status: 'paid',
                    transactionId: session.payment_intent,
                });
                await order.save();
                await user.save();

                console.log(`User ${userId} subscription updated via Stripe for product ${productType}.`);
            } else {
                console.warn(`Webhook ignored: User (${!!user}) or Product (${!!product}) not found.`);
            }
        } catch (dbError) {
            console.error('Error updating user subscription from Stripe webhook:', dbError);
            return res.status(500).send('Database Error');
        }
    }

    res.json({ received: true });
});

app.use(express.json());

// Load config/env
const config = {
    email_subject: '【学步步英语】验证码',
    expiresIn: '365d',
};

// --- MongoDB Connection ---
// --- MongoDB 连接 ---
mongoose.connect(process.env.mongoURI, {

    // 增加这些超时设置
    connectTimeoutMS: 10000,      // 连接超时 60秒
    socketTimeoutMS: 9000,       // Socket 超时 45秒
    serverSelectionTimeoutMS: 15000, // 服务器选择超时 60秒

    // 连接池设置
    maxPoolSize: 100,              // 最大连接数
    minPoolSize: 10,               // 最小连接数
    maxIdleTimeMS: 60000,         // 空闲连接超时

    // 重试设置
    retryWrites: true,
    retryReads: true,

    directConnection: true,
    // 副本集相关
    readPreference: 'primary'
})
    .then(async () => {
        console.log('MongoDB connected');

        // --- 自动初始化/更新产品 Price ID ---
        try {
            const updates = [
                { type: 'monthly', stripePriceId: 'price_1SlquVRv2dHZgmnc5kWaEPBl' },
                { type: 'quarterly', stripePriceId: 'price_1SlsE4Rv2dHZgmncqfZRKZ5f' },
                { type: 'yearly', stripePriceId: 'price_1Slr4pRv2dHZgmncWDchY4p4' }
            ];
            for (const item of updates) {
                await Product.findOneAndUpdate({ type: item.type }, { stripePriceId: item.stripePriceId });
            }
            console.log('Stripe Price IDs initialized/updated.');
        } catch (e) {
            console.error('Failed to initialize Stripe Price IDs:', e);
        }
    })
    .catch(err => console.error('MongoDB connection error:', err));

// --- Constants ---
const verificationCodeLength = 6;

// --- Helper Functions ---
function generateVerificationCode() {
    let code = '';
    for (let i = 0; i < verificationCodeLength; i++) {
        code += Math.floor(Math.random() * 10);
    }
    return code;
}

async function generateInvitationCode(userCount) {
    let code = (userCount + 1).toString(32).toUpperCase();
    const minLength = 4;
    if (code.length < minLength) {
        const charsNeeded = minLength - code.length;
        const randomChars = crypto.randomBytes(Math.ceil(charsNeeded / 2)).toString('hex').toUpperCase();
        code = randomChars.substring(0, charsNeeded) + 'I' + code;
    } else if (code.length === 4) {
        code = 'I' + code;
    }
    return code;
}

// --- Auth Middleware ---
const auth = async (req, res, next) => {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({ message: '未授权' });
    }
    try {
        const decoded = jwt.verify(token, process.env.token_secretKey);
        const { userId, sessionId } = decoded;

        if (!sessionId) {
            return res.status(401).json({ message: 'Token 已失效，请重新登录' });
        }

        const user = await User.findById(userId).select('+activeSessionId');
        if (!user) {
            return res.status(401).json({ message: '用户不存在' });
        }

        if (user.activeSessionId !== sessionId) {
            return res.status(401).json({ message: '您的账号已在别处登录，请重新登录' });
        }

        req.userId = userId;
        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
            return res.status(401).json({ message: 'Token 无效或已过期，请重新登录' });
        }
        console.error('认证中间件错误:', error);
        res.status(500).json({ message: '认证处理失败' });
    }
};

// --- Auth & User Info APIs ---

app.post('/api/sendVerificationCode', async (req, res) => {
    try {
        const { email } = req.body;
        const ipAddress = req.headers['x-forwarded-for']?.split(',').shift() || req.ip || req.socket.remoteAddress;

        const lastVerification = await EmailVerification.findOne({ email }).sort({ createdAt: -1 });
        if (lastVerification && (Date.now() - lastVerification.createdAt.getTime()) < 60000) {
            return res.status(429).json({ message: '请求过于频繁，请稍后再试' });
        }

        const verificationCode = generateVerificationCode();
        const verificationCodeExpires = new Date(Date.now() + 5 * 60 * 1000);

        const emailVerification = new EmailVerification({
            email,
            verificationCode,
            expirationTime: verificationCodeExpires,
            ipAddress,
        });
        await emailVerification.save();

        let region = 'Unknown';
        try {
            const data = searcher.search(ipAddress);
            if (typeof data === 'string') {
                region = data;
            } else if (data && typeof data === 'object') {
                // Handle object format: { country, province, city, isp }
                region = [data.country, data.province, data.city, data.isp].filter(Boolean).join('|');
            }
        } catch (e) {
            console.error('ip2region search error:', e);
        }
        console.log('Final region string:', region);
        const isChina = region.includes('中国') && !region.includes('香港') && !region.includes('台湾') && !region.includes('澳门');

        if (isChina) {
            const htmlBody = `
                    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
                        <h2 style="color: #333; text-align: center;">学步步 - 邮箱验证</h2>
                        <p>您好！</p>
                        <p>您正在登录或注册学步步平台，您的验证码为：</p>
                        <div style="text-align: center; margin: 30px 0;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1890ff; padding: 10px 20px; background-color: #f5f5f5; border-radius: 4px;">${verificationCode}</span>
                        </div>
                        <p>验证码在 <strong>5分钟</strong> 内有效，请勿泄露给他人。</p>
                        <p>如非本人操作，请忽略此邮件。</p>
                        <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;">
                        <p style="font-size: 12px; color: #999; text-align: center;">© ${new Date().getFullYear()} 学步步 xuebubu.com</p>
                    </div>`;
            const sendMailRequest = new $DM20151123.SingleSendMailRequest({
                accountName: 'team@xuebubu.com',
                addressType: 1, // 1: 发信地址
                toAddress: email,
                subject: config.email_subject,
                htmlBody: htmlBody,
                replyToAddress: false, // 是否使用管理控制台中配置的回信地址
            });

            try {
                const response = await dmClient.singleSendMail(sendMailRequest);
                return res.status(200).json({ message: '验证码发送成功' });
            } catch (error) {
                console.error('验证码发送失败:', error.message);
                // 根据错误码提供友好提示
                let userMessage = '邮件发送失败，请稍后重试';
                if (error.code === 'InvalidAccount.NoRealNameAuthentication') {
                    userMessage = '发信服务未完成实名认证，请检查阿里云账户';
                } else if (error.code === 'InvalidToAddress') {
                    userMessage = '收件人邮箱地址格式错误';
                }
                return res.status(500).json({ message: userMessage });
            }

        } else {
            await resend.emails.send({
                from: 'no-replay@xuebubu.org',
                to: email,
                subject: 'Your Verification Code for Xuebubu',
                html: `
                    <div style="font-family: sans-serif; max-width: 500px; margin: auto;">
                    <h2 style="color: #3d2e24;">Welcome to Xuebubu</h2>
                    <p>You are using <strong>Xuebubu</strong> language learning services.</p>
                    <p>Your verification code is:</p>
                    <div style="background: #fdfbf9; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; color: #ff8a65; border-radius: 10px;">
                        ${verificationCode}
                    </div>
                    <p style="font-size: 12px; color: #a1887f; margin-top: 20px;">
                        This code will expire in 5 minutes. If you did not request this, please ignore this email.
                    </p>
                    </div>
                    `
            });
        }
        res.status(200).json({ message: '验证码发送成功' });
    } catch (error) {
        console.error('发送验证码失败:', error);
        res.status(500).json({ message: '服务器发送验证码失败' });
    }
});

app.post('/api/loginWithVerificationCode', async (req, res) => {
    try {
        const { email, verificationCode, invitationCode: receivedInvitationCode } = req.body;

        const emailVerification = await EmailVerification.findOne({
            email,
            verificationCode,
            expirationTime: { $gt: new Date() },
            used: false
        });

        if (!emailVerification) {
            return res.status(400).json({ message: '验证码错误或已过期' });
        }

        let user = await User.findOne({ email });
        if (!user) {
            const userCount = await User.countDocuments();
            const invitationCode = await generateInvitationCode(userCount);
            user = new User({
                username: email,
                loginType: 'email',
                email,
                nickname: `bubu${userCount + 1}`,
                invitationCode: invitationCode,
            });

            // --- 新增：试用天数逻辑 ---
            const trialConfig = await SystemConfig.findOne({ key: 'trial_days' });
            const trialDays = trialConfig ? parseInt(trialConfig.value) : 0;
            if (trialDays > 0) {
                user.subscriptionExpiry = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);
            }

            await user.save();

            if (receivedInvitationCode) {
                const inviter = await User.findOne({ invitationCode: receivedInvitationCode });
                if (inviter) {
                    user.invitedBy = inviter._id;
                    await user.save();
                    inviter.invitedCount += 1;
                    await inviter.save();
                }
            }
        }

        const newSessionId = uuidv4();
        user.activeSessionId = newSessionId;
        user.lastLoginIP = emailVerification.ipAddress;
        await user.save();

        const token = jwt.sign(
            { userId: user._id, sessionId: newSessionId },
            process.env.token_secretKey,
            { expiresIn: config.expiresIn }
        );

        emailVerification.used = true;
        await emailVerification.save();

        res.status(200).json({ message: '登录成功', token });
    } catch (error) {
        console.error('验证码登录失败:', error);
        res.status(500).json({ message: '服务器验证码登录失败' });
    }
});

app.get('/api/userinfo', auth, async (req, res) => {
    try {
        const user = await User.findById(req.userId).populate({
            path: 'group',
            populate: { path: 'members', select: 'credits' }
        });
        if (!user) return res.status(404).json({ message: '用户不存在' });
        res.status(200).json({
            id: user._id,
            nickname: user.nickname,
            avatar: user.avatar,
            invitationCode: user.invitationCode,
            invitedCount: user.invitedCount,
            subscriptionExpiry: user.subscriptionExpiry,
            credits: user.credits,
            golds: user.golds,
            email: user.email,
            group: user.group,
        });
    } catch (error) {
        res.status(500).json({ message: '服务器获取用户信息失败' });
    }
});

// --- User Settings APIs ---

app.post('/api/setAvatar', auth, async (req, res) => {
    try {
        const { avatar } = req.body;
        await User.findByIdAndUpdate(req.userId, { avatar });
        res.status(200).json({ message: '头像设置成功', avatar });
    } catch (error) {
        res.status(500).json({ message: '服务器头像设置失败' });
    }
});

app.patch('/api/user/nickname', auth, async (req, res) => {
    try {
        const { nickname } = req.body;
        if (!nickname || nickname.trim().length === 0) return res.status(400).json({ message: '昵称不能为空' });
        await User.findByIdAndUpdate(req.userId, { nickname });
        res.status(200).json({ message: '昵称更新成功', nickname });
    } catch (error) {
        res.status(500).json({ message: '服务器更新昵称失败' });
    }
});

app.post('/api/user/bind-email', auth, async (req, res) => {
    try {
        const { email, verificationCode } = req.body;
        const emailVerification = await EmailVerification.findOne({
            email,
            verificationCode,
            expirationTime: { $gt: new Date() },
            used: false
        });
        if (!emailVerification) return res.status(400).json({ message: '验证码错误或已过期' });

        const user = await User.findByIdAndUpdate(req.userId, { email, username: email }, { new: true });
        emailVerification.used = true;
        await emailVerification.save();
        res.status(200).json({ message: '邮箱绑定成功', user });
    } catch (error) {
        res.status(500).json({ message: '服务器绑定邮箱失败' });
    }
});

// --- Group APIs ---

app.get('/api/groups/search', async (req, res) => {
    try {
        const { name } = req.query;
        if (!name) return res.status(200).json([]);
        const groups = await Group.find({ name: { $regex: name, $options: 'i' } }).limit(10);
        const results = await Promise.all(groups.map(async (group) => {
            const memberCount = await User.countDocuments({ group: group._id });
            return { id: group._id, name: group.name, slogan: group.slogan, avatar: group.avatar, memberCount };
        }));
        res.status(200).json(results);
    } catch (error) {
        res.status(500).json({ message: '服务器搜索班级失败' });
    }
});

app.post('/api/groups', auth, async (req, res) => {
    try {
        const { name, slogan, avatar } = req.body;
        const ownerId = req.userId;
        if (!name || name.trim().length === 0) return res.status(400).json({ message: '班级名称不能为空' });
        if (await Group.findOne({ name })) return res.status(400).json({ message: '该班级名称已被使用' });

        const newGroup = new Group({ name, slogan, avatar, owner: ownerId, members: [ownerId] });
        await newGroup.save();
        await User.findByIdAndUpdate(ownerId, { group: newGroup._id });
        res.status(201).json({ message: '班级创建成功', group: newGroup });
    } catch (error) {
        res.status(500).json({ message: '服务器创建班级失败' });
    }
});

app.post('/api/groups/:groupId/join', auth, async (req, res) => {
    try {
        const { groupId } = req.params;
        const user = await User.findById(req.userId);
        if (user.group) return res.status(400).json({ message: '您已经加入了一个班级' });
        if (!await Group.findById(groupId)) return res.status(404).json({ message: '班级不存在' });

        await User.findByIdAndUpdate(req.userId, { group: groupId });
        await Group.findByIdAndUpdate(groupId, { $addToSet: { members: req.userId } });
        res.status(200).json({ message: '成功加入班级' });
    } catch (error) {
        res.status(500).json({ message: '服务器加入班级失败' });
    }
});

app.post('/api/groups/leave', auth, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user || !user.group) return res.status(400).json({ message: '您尚未加入任何班级' });
        const groupId = user.group;
        await User.findByIdAndUpdate(req.userId, { $unset: { group: "" } });
        await Group.findByIdAndUpdate(groupId, { $pull: { members: req.userId } });
        res.status(200).json({ message: '成功退出班级' });
    } catch (error) {
        res.status(500).json({ message: '服务器退出班级失败' });
    }
});

app.patch('/api/groups/avatar', auth, async (req, res) => {
    try {
        const { avatar } = req.body;
        const user = await User.findById(req.userId).populate('group');
        if (!user || !user.group || user.group.owner.toString() !== req.userId) {
            return res.status(403).json({ message: '权限不足' });
        }
        await Group.findByIdAndUpdate(user.group._id, { avatar });
        res.status(200).json({ message: '群头像更新成功' });
    } catch (error) {
        res.status(500).json({ message: '服务器更新群头像失败' });
    }
});

app.patch('/api/groups/slogan', auth, async (req, res) => {
    try {
        const { slogan } = req.body;
        const user = await User.findById(req.userId).populate('group');
        if (!user || !user.group || user.group.owner.toString() !== req.userId) {
            return res.status(403).json({ message: '权限不足' });
        }
        await Group.findByIdAndUpdate(user.group._id, { slogan });
        res.status(200).json({ message: '群口号更新成功' });
    } catch (error) {
        res.status(500).json({ message: '服务器更新群口号失败' });
    }
});

app.delete('/api/groups/disband', auth, async (req, res) => {
    try {
        const user = await User.findById(req.userId).populate('group');
        if (!user || !user.group || user.group.owner.toString() !== req.userId) {
            return res.status(403).json({ message: '权限不足' });
        }
        const groupId = user.group._id;
        await User.updateMany({ group: groupId }, { $unset: { group: "" } });
        await Group.findByIdAndDelete(groupId);
        res.status(200).json({ message: '群已成功解散' });
    } catch (error) {
        res.status(500).json({ message: '服务器解散群失败' });
    }
});

// --- Message Board APIs ---

app.post('/api/message/create', auth, async (req, res) => {
    try {
        const { content, messageType } = req.body;
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ message: '用户不存在' });

        if (messageType === 'proposal') {
            if (!user.subscriptionExpiry || user.subscriptionExpiry < new Date()) {
                return res.status(403).json({ message: '只有订阅用户才能发起提案。' });
            }
        } else {
            const count = await Message.countDocuments({ author: req.userId, messageType: 'message' });
            if (count >= 5) return res.status(403).json({ message: '您最多只能创建5条留言。' });
        }

        const message = new Message({ author: req.userId, content, messageType: messageType || 'message' });
        await message.save();
        res.status(201).json(message);
    } catch (error) {
        res.status(500).json({ message: '创建失败' });
    }
});

app.get('/api/proposalsByStatus', async (req, res) => {
    try {
        const proposals = await Message.find({ messageType: 'proposal', status: { $in: ['approved', 'closed'] } })
            .populate('author', 'nickname avatar')
            .populate('replies.author', 'nickname avatar')
            .populate('votes.user', 'nickname avatar')
            .sort({ createdAt: -1 });
        res.status(200).json(proposals);
    } catch (error) {
        res.status(500).json({ message: '获取提案失败' });
    }
});

app.get('/api/messagesByUser', auth, async (req, res) => {
    try {
        const messages = await Message.find({ messageType: 'message', author: req.userId })
            .populate('author', 'nickname avatar')
            .populate('replies.author', 'nickname avatar')
            .sort({ createdAt: -1 });
        res.status(200).json(messages);
    } catch (error) {
        res.status(500).json({ message: '获取留言失败' });
    }
});

app.post('/api/messages/:id/vote', auth, async (req, res) => {
    try {
        const { voteType } = req.body;
        const message = await Message.findById(req.params.id);
        if (!message || message.messageType !== 'proposal') return res.status(404).json({ message: '提案不存在' });
        if (message.voteDeadline && new Date() > new Date(message.voteDeadline)) return res.status(400).json({ message: '投票已截止' });

        const existingVote = message.votes.find(v => v.user.equals(req.userId));
        if (existingVote) existingVote.voteType = voteType;
        else message.votes.push({ user: req.userId, voteType });

        await message.save();
        res.status(200).json(message);
    } catch (error) {
        res.status(500).json({ message: '投票失败' });
    }
});

app.post('/api/messages/:id/replies', auth, async (req, res) => {
    try {
        const { content } = req.body;
        const message = await Message.findById(req.params.id);
        if (!message) return res.status(404).json({ message: '不存在' });
        message.replies.push({ author: req.userId, content });
        await message.save();
        res.status(201).json(message);
    } catch (error) {
        res.status(500).json({ message: '回复失败' });
    }
});

// --- Leaderboard APIs ---

app.get('/api/leaderboard/groups', auth, async (req, res) => {
    try {
        const stats = await User.aggregate([
            { $match: { group: { $ne: null } } },
            { $group: { _id: "$group", totalCredits: { $sum: "$credits" } } },
            { $sort: { totalCredits: -1 } }
        ]);
        const groupIds = stats.map(g => g._id);
        const user = await User.findById(req.userId).select('group');
        const myGroupId = user?.group;
        const myRank = myGroupId ? groupIds.findIndex(id => id.equals(myGroupId)) + 1 : -1;

        const top10Groups = await Group.find({ '_id': { $in: groupIds.slice(0, 10) } }).lean();
        const top10 = top10Groups.map(g => ({
            ...g,
            totalCredits: stats.find(s => s._id.equals(g._id)).totalCredits,
            rank: groupIds.findIndex(id => id.equals(g._id)) + 1
        })).sort((a, b) => a.rank - b.rank);

        let myGroup = null;
        if (myGroupId && myRank > 10) {
            const g = await Group.findById(myGroupId).lean();
            myGroup = { ...g, totalCredits: stats.find(s => s._id.equals(myGroupId)).totalCredits, rank: myRank };
        }
        res.status(200).json({ top10, myGroup });
    } catch (error) {
        res.status(500).json({ message: '获取群排行榜失败' });
    }
});

app.get('/api/leaderboard/users', auth, async (req, res) => {
    try {
        const all = await User.find({}, 'nickname avatar credits').sort({ credits: -1 }).lean();
        const myRank = all.findIndex(u => u._id.toString() === req.userId) + 1;
        const me = all.find(u => u._id.toString() === req.userId);
        const top10 = all.slice(0, 10).map((u, i) => ({ rank: i + 1, ...u }));
        res.status(200).json({ top10, me: { rank: myRank, ...me } });
    } catch (error) {
        res.status(500).json({ message: '获取个人排行榜失败' });
    }
});

app.get('/api/leaderboard/group-members', auth, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('group');
        if (!user?.group) return res.status(404).json({ message: '未加入群组' });
        const members = await User.find({ group: user.group }, 'nickname avatar credits').sort({ credits: -1 }).lean();
        res.status(200).json(members.map((m, i) => ({ rank: i + 1, ...m })));
    } catch (error) {
        res.status(500).json({ message: '获取群内排行榜失败' });
    }
});

// --- Misc APIs ---

app.get('/api/almanac', (req, res) => {
    try {
        const today = new Date();
        const solarData = solarlunar.solar2lunar(today.getFullYear(), today.getMonth() + 1, today.getDate());
        const festival = solarData.lunarFestival || solarData.festival || '';
        res.status(200).json({
            lunarDate: `农历 ${solarData.monthCn}${solarData.dayCn}`,
            festival: festival,
            ganzhi: `${solarData.gzYear}年 ${solarData.gzMonth}月 ${solarData.gzDay}日`,
            jieqi: solarData.term || ''
        });
    } catch (error) {
        res.status(500).json({ message: '获取皇历失败' });
    }
});

app.post('/api/sso/generate', auth, async (req, res) => {
    try {
        const ssoToken = jwt.sign({ userId: req.userId }, process.env.token_secretKey, { expiresIn: '60s' });
        res.status(200).json({ sso_code: ssoToken });
    } catch (error) {
        res.status(500).json({ message: '生成授权码失败' });
    }
});

app.post('/api/verify-sso-code', async (req, res) => {
    const { code: ssoToken } = req.body;
    if (!ssoToken) return res.status(400).json({ message: '缺少授权码' });

    try {
        const decoded = jwt.verify(ssoToken, process.env.token_secretKey);
        const { userId } = decoded;
        if (!userId) return res.status(400).json({ message: '无效的授权码' });

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: '用户不存在' });

        const newSessionId = uuidv4();
        user.activeSessionId = newSessionId;
        user.lastLoginIP = req.headers['x-forwarded-for']?.split(',').shift() || req.ip;
        await user.save();

        const token = jwt.sign(
            { userId: user._id, sessionId: newSessionId },
            process.env.token_secretKey,
            { expiresIn: config.expiresIn || '24h' }
        );

        res.status(200).json({ token });
    } catch (error) {
        console.error('SSO 验证失败:', error);
        res.status(401).json({ message: '授权码无效或已过期' });
    }
});

// --- Original Products & Payment APIs ---

app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find().sort({ price: 1 });
        res.status(200).json(products);
    } catch (error) {
        res.status(500).json({ message: '获取产品失败' });
    }
});

// const pay = new WXPay({
//     appid: process.env.H5_APPID,
//     mchid: process.env.MCHID,
//     publicKey: fs.readFileSync(path.resolve(__dirname, '../../cert/apiclient_cert.pem')),
//     privateKey: fs.readFileSync(path.resolve(__dirname, '../../cert/apiclient_key.pem')),
// });

app.post('/api/payment/create-native', auth, async (req, res) => {
    try {
        const { productType } = req.body;
        const product = await Product.findOne({ type: productType });
        if (!product) return res.status(404).json({ message: '未找到产品' });

        const orderNo = `BUBU_INTL_${Date.now()}${Math.random().toString().slice(2, 8)}`;
        const newOrder = new Order({ orderNo, userId: req.userId, productId: product._id, amount: product.price, status: 'pending' });
        await newOrder.save();

        const params = {
            description: `Bubu English - ${product.name}`,
            out_trade_no: orderNo,
            notify_url: 'https://international.xuebubu.com/api/payment/webhook',
            amount: { total: Math.round(product.price * 100) },
        };

        const result = await pay.transactions_native(params);
        res.status(200).json({ codeUrl: result.data.code_url, orderNo });
    } catch (error) {
        console.error('WeChat Pay 订单创建失败:', error);
        res.status(500).json({ message: '创建支付订单失败' });
    }
});

// --- Stripe Payment API ---

app.post('/api/payment/create-stripe-session', auth, async (req, res) => {
    try {
        const { productType } = req.body;
        const product = await Product.findOne({ type: productType });
        if (!product) return res.status(404).json({ message: 'Product not found' });

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['wechat_pay', 'card'],
            payment_method_options: {
                wechat_pay: {
                    client: 'web',
                },
            },
            line_items: [
                {
                    // 如果数据库里有 Stripe Price ID，优先使用它（最安全）
                    ...(product.stripePriceId ? { price: product.stripePriceId } : {
                        price_data: {
                            currency: 'gbp',
                            product_data: {
                                name: `Xuebubu Membership - ${product.name}`,
                            },
                            unit_amount: Math.round(product.price * 100),
                        },
                    }),
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${req.headers.origin}/reward?status=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.headers.origin}/reward?status=cancel`,
            client_reference_id: req.userId.toString(),
            metadata: {
                productType: product.type,
                userId: req.userId.toString(),
            },
        });

        res.status(200).json({ url: session.url });
    } catch (error) {
        console.error('Stripe Checkout Session error:', error);
        res.status(500).json({ message: 'Failed to create stripe session' });
    }
});


app.post('/api/payment/webhook', async (req, res) => {
    try {
        const { resource } = req.body;
        if (!resource) throw new Error('Invalid webhook request');
        const { ciphertext, associated_data, nonce } = resource;
        const result = pay.decipher_gcm(ciphertext, associated_data, nonce, process.env.APIV3_KEY);

        if (result.trade_state === 'SUCCESS') {
            const { out_trade_no, transaction_id } = result;
            const session = await mongoose.startSession();
            await session.withTransaction(async () => {
                const order = await Order.findOneAndUpdate(
                    { orderNo: out_trade_no, status: 'pending' },
                    { status: 'paid', transactionId: transaction_id },
                    { session }
                );
                if (!order) return;
                const product = await Product.findById(order.productId).session(session);
                const user = await User.findById(order.userId).session(session);
                let days = 0;
                if (product.type === 'monthly') days = 31;
                else if (product.type === 'quarterly') days = 93;
                else if (product.type === 'yearly') days = 366;
                const current = (user.subscriptionExpiry && user.subscriptionExpiry > new Date()) ? user.subscriptionExpiry : new Date();
                user.subscriptionExpiry = new Date(current.getTime() + days * 24 * 60 * 60 * 1000);
                await user.save({ session });
            });
            session.endSession();
        }
        res.status(200).send();
    } catch (error) {
        res.status(500).send({ message: 'Webhook 处理失败' });
    }
});

app.get('/api/payment/query-status/:orderNo', auth, async (req, res) => {
    try {
        const order = await Order.findOne({ orderNo: req.params.orderNo, userId: req.userId });
        if (!order) return res.status(404).json({ message: '订单未找到' });
        res.status(200).json({ status: order.status });
    } catch (error) {
        res.status(500).json({ message: '查询订单状态失败' });
    }
});

app.listen(port, () => {
    console.log(`International server listening on port ${port}`);
});
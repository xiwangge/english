import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { fileURLToPath } from 'url';
import path from 'path';
import gTTS from 'node-gtts';
import fs from 'fs';
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
import config from './config.js';
import crypto from 'crypto';
import fetch from 'node-fetch'; // 引入 node-fetch
import uuid from 'uuid';
const { v4: uuidv4 } = uuid;

import ip2region from 'ip2region';
const Searcher = ip2region.default || ip2region;

import Book from '@english-learning/common/models/Book.js';
import User from '@english-learning/common/models/User.js';
import EmailVerification from '@english-learning/common/models/EmailVerification.js';
import UserBook from '@english-learning/common/models/UserBook.js';
import Word from '@english-learning/common/models/Word.js';
import Message from '@english-learning/common/models/Message.js';
import Group from '@english-learning/common/models/Group.js'; // 引入 Group 模型
import Product from '@english-learning/common/models/Product.js';
import Order from '@english-learning/common/models/Order.js';
import SystemConfig from '@english-learning/common/models/SystemConfig.js';
import VoiceTeacher from '@english-learning/common/models/VoiceTeacher.js';
import solarlunar from 'solarlunar';

const verificationCodeLength = 6; // 验证码长度

// 邮箱配置
const transporter = nodemailer.createTransport({
  service: config.email_service, // 使用163邮箱
  auth: {
    user: process.env.EMAIL_USER, // 你的邮箱账号
    pass: process.env.EMAIL_PASS // 你的邮箱授权码
  }
});


// --- ES Modules 路径处理 ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// ----------------------------

const app = express();
const port = 5001;

// 解决 CORS 和 JSON Body 解析
app.use(cors());
app.use(express.json());


// --- 中间件 ---

// JWT 认证中间件
// JWT 认证中间件 (增强版，带会话验证)
const auth = async (req, res, next) => {
  // 核心：强制不缓存任何带 Auth 的接口
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ message: '未授权' });
  }
  try {
    const decoded = jwt.verify(token, process.env.token_secretKey);
    const { userId, sessionId } = decoded;

    // 强制要求新版 Token 必须包含 sessionId
    if (!sessionId) {
      return res.status(401).json({ message: 'Token 已失效，请重新登录' });
    }

    const user = await User.findById(userId).select('+activeSessionId'); // 确保查询到 activeSessionId
    if (!user) {
      return res.status(401).json({ message: '用户不存在' });
    }

    // 核心验证：比较 Token 中的 sessionId 和数据库中的 activeSessionId
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
    return res.status(500).json({ message: '服务器认证失败' });
  }
};


// 检查用户订阅状态的中间件
async function checkSubscription(req, res, next) {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    if (!user.subscriptionExpiry || user.subscriptionExpiry < new Date()) {
      return res.status(403).json({ message: '请订阅后访问该课程' });
    }
    next();
  } catch (error) {
    console.error('检查订阅状态失败:', error);
    res.status(500).json({ message: '服务器检查订阅状态失败' });
  }
}

// 静态文件服务：托管 public 目录下的文件
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
  }
}));

// 为上传的图片提供专门的静态资源服务
app.use('/uploads', express.static(path.join(__dirname, 'public/images')));

app.get('/dictation', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dictation.html'));
});


// --- MongoDB 连接 ---
mongoose.connect(process.env.mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,

  // 增加这些超时设置
  connectTimeoutMS: 10000,      // 连接超时 60秒
  socketTimeoutMS: 9000,       // Socket 超时 45秒
  serverSelectionTimeoutMS: 15000, // 服务器选择超时 60秒

  // 连接池设置
  maxPoolSize: 200,              // 最大连接数
  minPoolSize: 20,               // 最小连接数
  maxIdleTimeMS: 60000,         // 空闲连接超时

  // 重试设置
  retryWrites: true,
  retryReads: true,

  // 副本集相关
  replicaSet: 'rsEnglish',
  readPreference: 'primary'
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));
// --------------------

// 创建 temp 目录
if (!fs.existsSync(path.join(__dirname, 'temp'))) {
  fs.mkdirSync(path.join(__dirname, 'temp'));
}


// --- API 路由 ---

// 文本转语音 API 路由
app.get('/api/tts', (req, res) => {
  console.log('--- 路由 /api/tts 进入 ---')
  // 1. 获取请求参数
  const text = req.query.text;
  const lang = req.query.lang || 'en';

  if (!text) {
    return res.status(400).send({ error: 'Please provide text in the "text" query parameter.' });
  }

  // 2. 实例化 gtts 并设置语言
  const gtts = new gTTS(lang); // 确保这里使用的是小写的 gtts 变量

  try {
    // 3. 设置响应头：告知浏览器这是一个 MP3 音频流
    res.set({
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'no-cache'
    });

    // 4. 生成音频流并管道传输到 Express 响应
    gtts.stream(text).pipe(res);

  } catch (error) {
    // 此处的 try/catch 只能捕获同步错误，gTTS 的 ETIMEDOUT 是异步错误
    console.error("gTTS 同步错误:", error);
    res.status(500).send({ error: 'Failed to generate speech audio due to internal error.' });
  }
});

// **注意：由于 gtts.stream() 返回的 Stream 可能会异步抛出 ETIMEDOUT 错误**
// 建议在 Stream 上也监听 'error' 事件以防止进程崩溃（但 pipe(res) 已经将错误事件转发给了 res）

// 生成随机验证码
function generateVerificationCode() {
  let code = '';
  for (let i = 0; i < verificationCodeLength; i++) {
    code += Math.floor(Math.random() * 10);
  }
  return code;
}

// 生成 32 进制邀请码
async function generateInvitationCode(userCount) {
  let code = (userCount + 1).toString(32).toUpperCase();
  const minLength = 4;
  if (code.length < minLength) {
    const charsNeeded = minLength - code.length;
    // 生成随机字符并转换为 32 进制
    const randomChars = crypto.randomBytes(Math.ceil(charsNeeded / 2)).toString('hex').toUpperCase();
    code = randomChars.substring(0, charsNeeded) + 'I' + code;
  } if (code.length == 4) {
    code = 'I' + code;
  }
  return code;
}


// --- SSO 单点登录验证接口 (JWT方案 + 会话绑定) ---
app.post('/api/verify-sso-code', async (req, res) => {
  const { code: ssoToken } = req.body;
  if (!ssoToken) {
    return res.status(400).json({ message: '缺少授权码' });
  }

  try {
    // 1. 使用共享密钥验证一次性 SSO Token
    const decoded = jwt.verify(ssoToken, process.env.token_secretKey);
    const { userId } = decoded;

    if (!userId) {
      return res.status(400).json({ message: '无效的授权码：缺少用户信息' });
    }

    // 2. 查找用户
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: '关联的用户不存在' });
    }

    // 3. 生成新的会话 ID 并更新用户信息
    const newSessionId = uuidv4();
    user.activeSessionId = newSessionId;
    user.lastLoginIP = req.headers['x-forwarded-for']?.split(',').shift() || req.ip;
    await user.save();

    // 4. 为用户生成一个新的、包含 sessionId 的应用 Token
    const appToken = jwt.sign(
      { userId: user._id, sessionId: newSessionId }, // 在 payload 中加入 sessionId
      process.env.token_secretKey,
      { expiresIn: config.expiresIn }
    );

    res.status(200).json({ token: appToken });

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: '授权码无效或已过期' });
    }
    console.error('SSO 验证失败:', error);
    res.status(500).json({ message: '服务器处理单点登录失败' });
  }
});

// --- 为跳转其他站点生成 SSO Code 的接口 ---
app.post('/api/sso/generate', auth, async (req, res) => {
  try {
    const userId = req.userId;

    // 使用共享密钥为当前用户生成一个短时效 (例如 60 秒) 的 SSO Token
    const ssoToken = jwt.sign(
      { userId: userId },
      process.env.token_secretKey, // 必须使用共享密钥
      { expiresIn: '60s' } // 设置较短的有效期
    );

    res.status(200).json({ sso_code: ssoToken });

  } catch (error) {
    console.error('生成 SSO Code 失败:', error);
    res.status(500).json({ message: '生成授权码失败' });
  }
});


// 发送邮箱验证码接口
app.post('/api/sendVerificationCode', async (req, res) => {
  try {
    const { email } = req.body;
    // 优先从 X-Forwarded-For 头获取真实 IP，否则使用 req.ip 或 req.socket.remoteAddress
    const ipAddress = req.headers['x-forwarded-for']?.split(',').shift() || req.ip || req.socket.remoteAddress;
    console.log('ipAddress', ipAddress);

    // 检查距离上次发送验证码的时间是否超过 60 秒
    const lastVerification = await EmailVerification.findOne({ email }).sort({ createdAt: -1 });
    if (lastVerification && (Date.now() - lastVerification.createdAt.getTime()) < 60000) {
      return res.status(429).json({ message: '请求过于频繁，请稍后再试' });
    }

    // 检查 24 小时内是否超过 12 次
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const verificationCount = await EmailVerification.countDocuments({
      email,
      createdAt: { $gte: twentyFourHoursAgo }
    });
    if (verificationCount >= 12) {
      return res.status(429).json({ message: '该邮箱24小时内请求验证码次数过多' });
    }

    // 检查 IP 地址是否超过 5 个邮箱
    const distinctEmailsForIp = await EmailVerification.distinct('email', {
      ipAddress
      // expirationTime: { $gt: new Date() }, // 只考虑未过期的记录
      // used: false // 只考虑未使用的记录
    });
    // 如果当前邮箱已经存在于该IP的有效邮箱列表中，则不计入限制
    if (!distinctEmailsForIp.includes(email) && distinctEmailsForIp.length >= 5) {
      return res.status(429).json({ message: '该IP地址已提交过多邮箱' });
    }

    const verificationCode = generateVerificationCode();
    const verificationCodeExpires = new Date(Date.now() + 5 * 60 * 1000); // 5分钟后过期

    // 创建 EmailVerification 实例
    const emailVerification = new EmailVerification({
      email,
      verificationCode,
      expirationTime: verificationCodeExpires,
      ipAddress,
    });

    // 保存 EmailVerification 实例
    await emailVerification.save();

    // 发送邮件
    const mailOptions = {
      from: process.env.EMAIL_USER, // 你的邮箱账号
      to: email,
      subject: config.email_subject,
      text: `您的验证码是：${verificationCode}，请在5分钟内使用。`
    };

    transporter.sendMail(mailOptions, async (error, info) => {
      if (error) {
        console.error('发送邮件失败:', error);
        return res.status(500).json({ message: '发送邮件失败' });
      }

      res.status(200).json({ message: '验证码发送成功' });
    });
  } catch (error) {
    console.error('发送验证码失败:', error);
    res.status(500).json({ message: '服务器发送验证码失败' });
  }
});


// 邮箱验证码登录接口
app.post('/api/loginWithVerificationCode', async (req, res) => {
  try {
    const { email, verificationCode, invitationCode: receivedInvitationCode } = req.body;

    // 从 EmailVerification 表中查找验证码
    const emailVerification = await EmailVerification.findOne({
      email,
      verificationCode,
      expirationTime: { $gt: new Date() } // 验证是否过期
    });

    if (!emailVerification) {
      return res.status(400).json({ message: '验证码错误或已过期' });
    }

    let ip = emailVerification.ipAddress;
    // 需要下载 ip2region.xdb 文件放到项目中
    const searcher = new Searcher({ dbPath: './ip2region_v4.xdb' });
    let city = '';
    try {
      const data = searcher.search(ip);
      console.log('ip2region search result:', data);
      // data 可能是字符串也可能是对象，取决于库的版本
      // 这里的 split 报错是因为 data 可能不是字符串
      let region = '';
      if (typeof data === 'string') {
        region = data;
      } else if (data && typeof data.region === 'string') {
        region = data.region;
      }

      city = region ? (region.split('|')[3] || '未知') : '未知';
    } catch (e) {
      console.log('ip2region search error:', e);
      city = '未知';
    }

    // 创建新用户
    let user = await User.findOne({ email });
    if (!user) {
      let userCount = await User.countDocuments();
      // 将用户总数 + 1 转换为 32 进制字符串
      const invitationCode = await generateInvitationCode(userCount);
      user = new User({
        username: email, // 使用邮箱作为用户名
        loginType: 'email',
        email,
        nickname: `bubu${userCount + 1}`,
        invitationCode: invitationCode,
        city: city
      });

      // --- 新增：试用天数逻辑 ---
      const trialConfig = await SystemConfig.findOne({ key: 'trial_days' });
      const trialDays = trialConfig ? parseInt(trialConfig.value) : 0;
      if (trialDays > 0) {
        user.subscriptionExpiry = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);
      }

      await user.save();

      // 处理邀请逻辑
      if (receivedInvitationCode) {
        const inviter = await User.findOne({ invitationCode: receivedInvitationCode });
        if (inviter) {
          user.invitedBy = inviter._id;
          await user.save(); // 保存新用户的 invitedBy 字段
          inviter.invitedCount += 1;
          await inviter.save(); // 更新邀请者的 invitedCount
        }
      }
    }

    // 生成新的会话 ID 并更新用户信息
    const newSessionId = uuidv4();
    user.activeSessionId = newSessionId;
    user.lastLoginIP = emailVerification.ipAddress;
    await user.save();

    // 生成 JWT (包含 sessionId 以匹配 auth 中间件的验证需求)
    const token = jwt.sign(
      { userId: user._id, sessionId: newSessionId },
      process.env.token_secretKey,
      { expiresIn: config.expiresIn }
    );

    // 标记 EmailVerification 记录为已使用
    emailVerification.used = true;
    await emailVerification.save();

    res.status(200).json({ message: '登录成功', token: token, token: token });
  } catch (error) {
    console.error('验证码登录失败:', error);
    res.status(500).json({ message: '服务器验证码登录失败' });
  }
});

// 获取用户信息接口
app.get('/api/userinfo', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .populate('preferredTeacher')
      .populate({
        path: 'group',
        populate: {
          path: 'members',
          select: 'credits' // 只需要成员的学分信息即可
        }
      });
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    res.status(200).json({
      nickname: user.nickname,
      avatar: user.avatar,
      invitationCode: user.invitationCode,
      invitedCount: user.invitedCount,
      subscriptionExpiry: user.subscriptionExpiry,
      credits: user.credits,
      golds: user.golds,
      email: user.email,
      group: user.group, // 返回群组信息
      preferredTeacher: user.preferredTeacher, // 返回偏好的发音老师信息
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({ message: '服务器获取用户信息失败' });
  }
});

// 头像设置接口
app.post('/api/setAvatar', auth, async (req, res) => {
  try {
    const { avatar } = req.body;
    const user = await User.findByIdAndUpdate(req.userId, { avatar }, { new: true });
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    res.status(200).json({ message: '头像设置成功', avatar: user.avatar });
  } catch (error) {
    console.error('头像设置失败:', error);
    res.status(500).json({ message: '服务器头像设置失败' });
  }
});

// 更新用户昵称接口
app.patch('/api/user/nickname', auth, async (req, res) => {
  try {
    const { nickname } = req.body;
    if (!nickname || nickname.trim().length === 0) {
      return res.status(400).json({ message: '昵称不能为空' });
    }
    const user = await User.findByIdAndUpdate(req.userId, { nickname }, { new: true });
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    res.status(200).json({ message: '昵称更新成功', nickname: user.nickname });
  } catch (error) {
    console.error('更新昵称失败:', error);
    res.status(500).json({ message: '服务器更新昵称失败' });
  }
});

// 绑定邮箱接口
app.post('/api/user/bind-email', auth, async (req, res) => {
  try {
    const { email, verificationCode } = req.body;

    // 验证验证码
    const emailVerification = await EmailVerification.findOne({
      email,
      verificationCode,
      expirationTime: { $gt: new Date() },
      used: false
    });

    if (!emailVerification) {
      return res.status(400).json({ message: '验证码错误或已过期' });
    }

    // 更新用户信息
    const user = await User.findByIdAndUpdate(req.userId, {
      email: email,       // 更新邮箱
      username: email     // 👈 同时将用户名更新为邮箱
    }, { new: true });
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    // 标记验证码为已使用
    emailVerification.used = true;
    await emailVerification.save();

    res.status(200).json({ message: '邮箱绑定成功', user });
  } catch (error) {
    console.error('绑定邮箱失败:', error);
    res.status(500).json({ message: '服务器绑定邮箱失败' });
  }
});

// --- 发音老师相关 API ---

// 获取所有可用的老师
app.get('/api/teachers', auth, async (req, res) => {
  try {
    const teachers = await VoiceTeacher.find({ isActive: true });
    res.status(200).json(teachers);
  } catch (error) {
    res.status(500).json({ message: '获取老师列表失败' });
  }
});

// 设置偏好的老师
app.post('/api/user/preferred-teacher', auth, async (req, res) => {
  try {
    const { teacherId } = req.body;
    // teacherId 可以为 null (恢复默认)
    await User.findByIdAndUpdate(req.userId, { preferredTeacher: teacherId || null });
    res.status(200).json({ message: '老师设置成功' });
  } catch (error) {
    res.status(500).json({ message: '设置老师失败' });
  }
});

// --- Group (班级) API ---

// 搜索班级
app.get('/api/groups/search', async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) {
      return res.status(200).json([]);
    }
    // 使用正则表达式进行模糊搜索，i 表示不区分大小写
    const groups = await Group.find({ name: { $regex: name, $options: 'i' } }).limit(10);

    // 返回包含成员数量的结果
    const results = await Promise.all(groups.map(async (group) => {
      const memberCount = await User.countDocuments({ group: group._id });
      return {
        id: group._id,
        name: group.name,
        slogan: group.slogan,
        avatar: group.avatar,
        memberCount: memberCount
      };
    }));

    res.status(200).json(results);
  } catch (error) {
    console.error('搜索班级失败:', error);
    res.status(500).json({ message: '服务器搜索班级失败' });
  }
});

// 创建班级
app.post('/api/groups', auth, async (req, res) => {
  try {
    const { name, slogan, avatar } = req.body;
    const ownerId = req.userId;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: '班级名称不能为空' });
    }

    const existingGroup = await Group.findOne({ name });
    if (existingGroup) {
      return res.status(400).json({ message: '该班级名称已被使用' });
    }

    const newGroup = new Group({
      name,
      slogan,
      avatar,
      owner: ownerId,
      members: [ownerId] // 创建者是第一个成员
    });
    await newGroup.save();

    // 更新创建者的 group 字段
    await User.findByIdAndUpdate(ownerId, { group: newGroup._id });

    res.status(201).json({ message: '班级创建成功', group: newGroup });
  } catch (error) {
    console.error('创建班级失败:', error);
    res.status(500).json({ message: '服务器创建班级失败' });
  }
});

// 加入班级
app.post('/api/groups/:groupId/join', auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.userId;

    const user = await User.findById(userId);
    if (user.group) {
      return res.status(400).json({ message: '您已经加入了一个班级，不能重复加入' });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: '班级不存在' });
    }

    // 更新用户和班级信息
    await User.findByIdAndUpdate(userId, { group: groupId });
    await Group.findByIdAndUpdate(groupId, { $addToSet: { members: userId } }); // $addToSet 避免重复添加

    res.status(200).json({ message: '成功加入班级' });
  } catch (error) {
    console.error('加入班级失败:', error);
    res.status(500).json({ message: '服务器加入班级失败' });
  }
});

// 退出班级
app.post('/api/groups/leave', auth, async (req, res) => {
  try {
    const userId = req.userId;

    const user = await User.findById(userId);
    if (!user || !user.group) {
      return res.status(400).json({ message: '您尚未加入任何班级' });
    }

    const groupId = user.group;

    // 从用户信息中移除 group 字段
    await User.findByIdAndUpdate(userId, { $unset: { group: "" } });

    // 从班级的 members 列表中移除该用户
    await Group.findByIdAndUpdate(groupId, { $pull: { members: userId } });

    res.status(200).json({ message: '成功退出班级' });
  } catch (error) {
    console.error('退出班级失败:', error);
    res.status(500).json({ message: '服务器退出班级失败' });
  }
});

// 更新群头像 (仅限群主)
app.patch('/api/groups/avatar', auth, async (req, res) => {
  try {
    const { avatar } = req.body;
    const userId = req.userId;

    if (!avatar) {
      return res.status(400).json({ message: '必须提供头像信息' });
    }

    const user = await User.findById(userId).populate('group');
    if (!user || !user.group) {
      return res.status(404).json({ message: '用户未加入任何群组' });
    }

    // 检查用户是否是群主
    if (user.group.owner.toString() !== userId) {
      return res.status(403).json({ message: '只有群主才能修改群头像' });
    }

    // 更新群头像
    await Group.findByIdAndUpdate(user.group._id, { avatar });

    res.status(200).json({ message: '群头像更新成功' });
  } catch (error) {
    console.error('更新群头像失败:', error);
    res.status(500).json({ message: '服务器更新群头像失败' });
  }
});

// 更新群口号 (仅限群主)
app.patch('/api/groups/slogan', auth, async (req, res) => {
  try {
    const { slogan } = req.body;
    const userId = req.userId;

    if (!slogan || slogan.trim().length === 0) {
      return res.status(400).json({ message: '口号不能为空' });
    }

    const user = await User.findById(userId).populate('group');
    if (!user || !user.group) {
      return res.status(404).json({ message: '用户未加入任何群组' });
    }

    // 检查用户是否是群主
    if (user.group.owner.toString() !== userId) {
      return res.status(403).json({ message: '只有群主才能修改群口号' });
    }

    // 更新群口号
    await Group.findByIdAndUpdate(user.group._id, { slogan });

    res.status(200).json({ message: '群口号更新成功' });
  } catch (error) {
    console.error('更新群口号失败:', error);
    res.status(500).json({ message: '服务器更新群口号失败' });
  }
});

// 解散群 (仅限群主)
app.delete('/api/groups/disband', auth, async (req, res) => {
  try {
    const userId = req.userId;

    const user = await User.findById(userId).populate('group');
    if (!user || !user.group) {
      return res.status(404).json({ message: '用户未加入任何群组' });
    }

    const groupId = user.group._id;

    // 检查用户是否是群主
    if (user.group.owner.toString() !== userId) {
      return res.status(403).json({ message: '只有群主才能解散群' });
    }

    // 更新所有成员，移除 group 字段
    await User.updateMany({ group: groupId }, { $unset: { group: "" } });

    // 删除群
    await Group.findByIdAndDelete(groupId);

    res.status(200).json({ message: '群已成功解散' });
  } catch (error) {
    console.error('解散群失败:', error);
    res.status(500).json({ message: '服务器解散群失败' });
  }
});


// 添加用户课程 (已重构)
app.post('/api/userBook/create', auth, async (req, res) => {
  try {
    const { bookId } = req.body; // 【修正】只接收 bookId
    const userId = req.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    const book = await Book.findById(bookId).select('units._id');
    if (!book) {
      return res.status(404).json({ message: '书籍不存在' });
    }

    // 检查用户是否已添加此书
    let userBook = await UserBook.findOne({ userId: userId, bookId: bookId });
    if (userBook) {
      return res.status(400).json({ message: '您已添加此课程' });
    }

    // 【修正】创建新 UserBook 时，自动填充所有单元
    const unitsToTrack = book.units.map(unit => ({
      unitId: unit._id, // unit._id 现在存在了
      completed: false
    }));

    userBook = new UserBook({
      userId: userId,
      bookId: bookId,
      units: unitsToTrack // 预填充所有单元
    });

    await userBook.save();

    res.status(200).json({ message: '课程添加成功' });
  } catch (error) {
    console.error('添加课程失败:', error);
    res.status(500).json({ message: '服务器添加课程失败' });
  }
});

// 获取用户正在学习的课程
app.get('/api/learning-bookIds', auth, async (req, res) => {
  try {
    const userId = req.userId;
    // 从数据库中获取用户学习的课程
    const userBooks = await UserBook.find({ userId });

    const books = userBooks.map(userBook => {
      return {
        id: userBook.bookId._id
      };
    });

    res.status(200).json(books);
  } catch (error) {
    console.error('获取用户正在学习的课程失败:', error.message);
    console.error('堆栈信息:', error.stack);
    res.status(500).json({ message: '服务器获取用户正在学习的课程失败' });
  }
});

// 获取用户正在学习的课程
app.get('/api/learning-books', auth, async (req, res) => {
  try {
    const userId = req.userId;
    // 从数据库中获取用户学习的课程
    const userBooks = await UserBook.find({ userId })
      .populate({ path: 'bookId', select: '-units' });

    const books = userBooks.map(userBook => {
      const progress = userBook.units.length > 0 ? (userBook.units.filter(unit => unit.completed).length / userBook.units.length) * 100 : 0;
      // 获取 lastCompletedUnitId
      const lastCompletedUnit = userBook.units.filter(unit => unit.completed).pop();
      const lastCompletedUnitId = lastCompletedUnit ? lastCompletedUnit.unitId : null;
      return {
        id: userBook.bookId._id,
        name: userBook.bookId.bookName,
        description: userBook.bookId.description,
        coverImage: userBook.bookId.coverImage,
        progress: progress,
        lastCompletedUnitId: lastCompletedUnitId, // 添加 lastCompletedUnitId
        isFree: userBook.bookId.isFree // 添加 isFree
      };
    });

    res.status(200).json(books);
  } catch (error) {
    console.error('获取用户正在学习的课程失败:', error.message);
    console.error('堆栈信息:', error.stack);
    res.status(500).json({ message: '服务器获取用户正在学习的课程失败' });
  }
});


// 获取所有书籍只包含上架的
app.get('/api/allBooks', async (req, res) => {
  try {
    const books = await Book.find({ isOnShelf: true }).select('-units').lean();

    // 并行统计每本书的添加人数和完成人数
    const booksWithStats = await Promise.all(books.map(async (book) => {
      const addedCount = await UserBook.countDocuments({ bookId: book._id });
      const completedCount = await UserBook.countDocuments({ bookId: book._id, completed: true });
      return {
        ...book,
        addedCount,
        completedCount
      };
    }));

    res.status(200).json(booksWithStats);
  } catch (error) {
    console.error('获取所有书籍失败:', error);
    res.status(500).json({ message: '服务器获取所有书籍失败' });
  }
});

// 根据 bookId 获取 book
app.get('/api/book/getBook', async (req, res) => {
  try {
    const { bookId } = req.query;
    if (!bookId) {
      return res.status(400).json({ message: '必须提供 bookId' });
    }

    const book = await Book.findById(bookId).select('-units.words -units.sentences');
    if (!book) {
      return res.status(404).json({ message: '未找到该教材' });
    }

    res.status(200).json(book);
  } catch (error) {
    console.error('获取 book失败:', error);
    res.status(500).json({ message: '服务器获取 book失败' });
  }
});

// 创建或更新单元
app.post('/api/book/createUnit', async (req, res) => {
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

// 根据 userId 和 bookId 获取 userBook 对象
app.get('/api/userBook/getUserBook', auth, async (req, res) => {
  try {
    const { bookId } = req.query;
    const userId = req.userId;
    if (!bookId) {
      return res.status(400).json({ message: '必须提供 bookId' });
    }

    const userBook = await UserBook.findOne({ userId: userId, bookId: bookId }).populate({
      path: 'bookId',
      select: '-units.words -units.sentences'
    });

    if (!userBook) {
      return res.status(404).json({ message: '未找到该用户课程' });
    }

    res.status(200).json(userBook);
  } catch (error) {
    console.error('获取 userBook 失败:', error);
    res.status(500).json({ message: '服务器获取 userBook 失败' });
  }
});


// 有道API要求的签名截断函数
function truncate(q) {
  const len = q.length;
  if (len <= 20) return q;
  return q.substring(0, 10) + len + q.substring(len - 10, len);
}

// 【新路由】
app.get('/api/lookup', async (req, res) => {
  const { word } = req.query;
  if (!word) {
    return res.status(400).json({ error: '缺少单词' });
  }

  const salt = crypto.randomUUID();
  const curtime = Math.round(new Date().getTime() / 1000);
  const query = word;

  // 1. 生成签名
  const str1 = process.env.YOUDAO_APP_KEY + truncate(query) + salt + curtime + config.YOUDAO_APP_SECRET;
  const sign = crypto.createHash('sha256').update(str1).digest('hex');

  // 2. 准备请求参数
  const params = new URLSearchParams({
    q: query,
    from: 'en',
    to: 'zh-CHS', // 英语到简体中文
    appKey: process.env.YOUDAO_APP_KEY,
    salt: salt,
    sign: sign,
    signType: 'v3',
    curtime: curtime,
  });

  try {
    // 3. 发送请求到有道
    const youdaoResponse = await fetch('https://openapi.youdao.com/api?' + params.toString(), {
      method: 'POST',
    });

    const data = await youdaoResponse.json();

    // 4. 将结果转发给前端
    res.status(200).json(data);

  } catch (error) {
    console.error('有道API请求失败:', error);
    res.status(500).json({ error: '服务器查询有道失败' });
  }
});

// 根据单词查询中文和音标
app.get('/api/word/query', async (req, res) => {
  try {
    const { word } = req.query;
    if (!word) {
      return res.status(400).json({ message: '必须提供单词' });
    }

    const result = await Word.findOne({ text: word });

    if (!result) {
      return res.status(404).json({ message: '未找到该单词' });
    }

    res.status(200).json({ chinese: result.chinese, phonetic: result.phonetic });
  } catch (error) {
    console.error('查询单词失败:', error);
    res.status(500).json({ message: '服务器查询单词失败' });
  }
});

// 根据 userId 和 bookId 依据用户课程的进度，获取用户最新要完成的 units，使前端能获取 words 和 sentences
app.get('/api/userBook/getNextUnit', auth, async (req, res) => {
  try {
    const { bookId } = req.query;
    const userId = req.userId;
    if (!bookId) {
      return res.status(400).json({ message: '必须提供 bookId' });
    }

    const userBook = await UserBook.findOne({ userId: userId, bookId: bookId })
      .populate({
        path: 'bookId',
        select: 'units bookName credits',
        populate: [
          { path: 'units.words', model: 'Word' },
          { path: 'units.sentences.words', model: 'Word' }
        ]
      })
      .lean();
    if (!userBook) {
      return res.status(404).json({ message: '未找到该用户课程' });
    }

    let nextUnit = null;
    for (const unit of userBook.units) {
      if (!unit.completed) {
        nextUnit = unit;
        break;
      }
    }

    if (!nextUnit) {
      return res.status(200).json({ message: '课程已全部完成' });
    }

    // 【关键修正】: bookId 现在是被填充的对象
    if (!userBook.bookId || !userBook.bookId.units) {
      return res.status(404).json({ message: '关联的书籍或单元数据不存在' });
    }

    // 查找对应的 unit
    const unit = userBook.bookId.units.find(u => nextUnit.unitId && u._id.equals(nextUnit.unitId));
    if (!unit) {
      return res.status(404).json({ message: '未找到该单元' });
    }

    res.status(200).json({
      unitName: unit.unit,
      nextUnit: nextUnit,
      words: unit.words,
      sentences: unit.sentences,
      bookCredits: userBook.bookId.credits
      // totalUnits: userBook.bookId.units.length
    });
  } catch (error) {
    console.error('获取下一个单元失败:', error);
    res.status(500).json({ message: '服务器获取下一个单元失败' });
  }
});

// 根据 userId, bookId 和 unitId 将单元标记为已完成
app.post('/api/userBook/completeUnit', auth, async (req, res) => {
  try {
    const { bookId, unitId, creditsEarned } = req.body;
    const userId = req.userId;

    if (!bookId || !unitId) {
      return res.status(400).json({ message: '必须提供 bookId 和 unitId' });
    }

    const userBook = await UserBook.findOne({ userId: userId, bookId: bookId });

    if (!userBook) {
      return res.status(404).json({ message: '未找到该用户课程' });
    }

    const unitToUpdate = userBook.units.find(u => u.unitId.equals(unitId));
    if (unitToUpdate && !unitToUpdate.completed) {
      unitToUpdate.completed = true;

      // 检查是否所有单元都已完成
      const allUnitsCompleted = userBook.units.every(u => u.completed);
      if (allUnitsCompleted) {
        userBook.completed = true;
      }

      // 增加用户学分
      if (creditsEarned && creditsEarned > 0) {
        const user = await User.findById(userId);
        if (user) {
          user.credits = (user.credits || 0) + creditsEarned;
          user.golds = (user.golds || 0) + creditsEarned;
          await user.save();
        }
      }

      await userBook.save();
      res.status(200).json({ message: '单元完成，学分已增加！', allCompleted: allUnitsCompleted });

    } else if (unitToUpdate && unitToUpdate.completed) {
      res.status(200).json({ message: '单元之前已完成' });
    } else {
      console.warn(`Unit ${unitId} not found in UserBook ${userBook._id} but proceeding.`);
      res.status(200).json({ message: '单元未在用户课程中找到，但允许继续' });
    }

  } catch (error) {
    console.error('标记单元完成失败:', error);
    res.status(500).json({ message: '服务器标记单元完成失败' });
  }
});


// --- 排行榜 API ---
// 1. 群排行榜
app.get('/api/leaderboard/groups', auth, async (req, res) => {
  try {
    // 聚合管道：计算每个群组的总学分
    const groupsWithTotalCredits = await User.aggregate([
      { $match: { group: { $ne: null } } }, // 只考虑有群组的用户
      { $group: { _id: "$group", totalCredits: { $sum: "$credits" }, memberCount: { $sum: 1 } } },
      { $sort: { totalCredits: -1 } }
    ]);

    // 获取所有群组的 ID 列表
    const groupIds = groupsWithTotalCredits.map(g => g._id);

    // 获取当前用户的群组 ID
    const currentUser = await User.findById(req.userId).select('group');
    const currentUserGroupId = currentUser ? currentUser.group : null;

    // 找到当前用户群组的排名
    let currentUserGroupRank = -1;
    if (currentUserGroupId) {
      currentUserGroupRank = groupIds.findIndex(id => id.equals(currentUserGroupId)) + 1;
    }

    // 获取 Top 20 的群组信息
    const top20GroupIds = groupIds.slice(0, 20);
    const top20Groups = await Group.find({ '_id': { $in: top20GroupIds } }).lean();

    // 将总学分附加到群组信息上
    const top20Result = top20Groups.map(group => {
      const stats = groupsWithTotalCredits.find(g => g._id.equals(group._id));
      return {
        ...group,
        totalCredits: stats ? stats.totalCredits : 0,
        memberCount: stats ? stats.memberCount : 0,
        rank: groupIds.findIndex(id => id.equals(group._id)) + 1
      };
    }).sort((a, b) => a.rank - b.rank); // 确保排序正确

    let myGroupInfo = null;
    // 如果当前用户的群组不在 Top 20 且存在
    if (currentUserGroupId && currentUserGroupRank > 20) {
      const myGroup = await Group.findById(currentUserGroupId).lean();
      const myGroupStats = groupsWithTotalCredits.find(g => g._id.equals(currentUserGroupId));
      myGroupInfo = {
        ...myGroup,
        totalCredits: myGroupStats ? myGroupStats.totalCredits : 0,
        memberCount: myGroupStats ? myGroupStats.memberCount : 0,
        rank: currentUserGroupRank
      };
    }

    res.status(200).json({
      top10: top20Result,
      myGroup: myGroupInfo
    });

  } catch (error) {
    console.error('获取群排行榜失败:', error);
    res.status(500).json({ message: '服务器获取群排行榜失败' });
  }
});

// 2. 个人排行榜
app.get('/api/leaderboard/users', auth, async (req, res) => {
  try {
    // 获取所有用户排名
    const allUsersRanked = await User.find({}, 'nickname avatar credits')
      .sort({ credits: -1 })
      .lean();

    // 找到当前用户的排名
    const myRank = allUsersRanked.findIndex(user => user._id.toString() === req.userId) + 1;
    const me = allUsersRanked.find(user => user._id.toString() === req.userId);

    // 确保 myInfo 总是被填充
    const myInfo = {
      rank: myRank,
      ...me
    };

    // 获取 Top 20 用户
    const top20 = allUsersRanked.slice(0, 20).map((user, index) => ({
      rank: index + 1,
      ...user
    }));

    res.status(200).json({ top10: top20, me: myInfo });
  } catch (error) {
    console.error('获取个人排行榜失败:', error);
    res.status(500).json({ message: '服务器获取个人排行榜失败' });
  }
});

// 3. 我的群内排行榜
app.get('/api/leaderboard/group-members', auth, async (req, res) => {
  try {
    // 1. 查找当前用户及其群组信息
    const currentUser = await User.findById(req.userId).select('group');
    if (!currentUser || !currentUser.group) {
      return res.status(404).json({ message: '您尚未加入任何群组' });
    }

    // 2. 查找群组内的所有成员，并按学分排序
    const groupMembers = await User.find({ group: currentUser.group }, 'nickname avatar credits')
      .sort({ credits: -1 })
      .lean();

    // 3. 找到当前用户在群内的排名
    const myRankInGroup = groupMembers.findIndex(member => member._id.toString() === req.userId) + 1;
    const me = groupMembers.find(member => member._id.toString() === req.userId);
    const myInfo = {
      rank: myRankInGroup,
      ...me
    };

    // 4. 获取群内 Top 50
    const top50InGroup = groupMembers.slice(0, 50).map((member, index) => ({
      rank: index + 1,
      ...member
    }));

    res.status(200).json({ top10: top50InGroup, me: myInfo });

  } catch (error) {
    console.error('获取群内排行榜失败:', error);
    res.status(500).json({ message: '服务器获取群内排行榜失败' });
  }
});

/*
// --- 产品 API ---
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find().sort({ price: 1 });
        res.status(200).json(products);
    } catch (error) {
        console.error('获取产品列表失败:', error);
        res.status(500).json({ message: '服务器获取产品列表失败' });
    }
});


// --- 微信支付 API ---

const pay = new WXPay({
  appid: process.env.H5_APPID,
  mchid: process.env.MCHID,
  publicKey: fs.readFileSync(path.resolve(__dirname, '../cert/apiclient_cert.pem')), // 公钥
  privateKey: fs.readFileSync(path.resolve(__dirname, '../cert/apiclient_key.pem')), // 秘钥
});

// 1. 创建支付订单 (Native)
app.post('/api/payment/create-native', auth, async (req, res) => {
    try {
        const { productType } = req.body;
        const userId = req.userId;

        const product = await Product.findOne({ type: productType });
        if (!product) {
            return res.status(404).json({ message: '产品不存在' });
        }

        const orderNo = `BUBU_${Date.now()}${Math.random().toString().slice(2, 8)}`;
        
        // 创建数据库订单
        const newOrder = new Order({
            orderNo,
            userId,
            productId: product._id,
            amount: product.price,
            status: 'pending',
        });
        await newOrder.save();

        const params = {
            description: `布布英语 - ${product.name}`,
            out_trade_no: orderNo,
            notify_url: 'https://xuebubu.com/api/payment/webhook',
            amount: {
                total: Math.round(product.price * 100), // 价格转为分
            },
        };

        const result = await pay.transactions_native(params);
        res.status(200).json({ codeUrl: result.data.code_url, orderNo });

    } catch (error) {
        console.error('创建微信支付订单失败:', error);
        res.status(500).json({ message: '创建支付订单失败' });
    }
});

// 2. 支付回调通知
app.post('/api/payment/webhook', async (req, res) => {
    try {
        const { resource } = req.body;
        if (!resource) {
            throw new Error('无效的回调请求体');
        }
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
                
                if (!order) {
                    console.log(`回调通知：订单 ${out_trade_no} 不存在或已处理。`);
                    return;
                }

                const product = await Product.findById(order.productId).session(session);
                const user = await User.findById(order.userId).session(session);
                
                let daysToAdd = 0;
                if (product.type === 'monthly') daysToAdd = 31;
                else if (product.type === 'quarterly') daysToAdd = 93;
                else if (product.type === 'yearly') daysToAdd = 366;

                const currentExpiry = (user.subscriptionExpiry && user.subscriptionExpiry > new Date()) ? user.subscriptionExpiry : new Date();
                user.subscriptionExpiry = new Date(currentExpiry.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
                
                await user.save({ session });
            });
            session.endSession();
        }
        
        res.status(200).send(); // 成功处理，返回 200 OK
    } catch (error) {
        console.error('微信支付回调处理失败:', error);
        res.status(500).send({ message: '处理失败' });
    }
});

// 3. 查询订单状态
app.get('/api/payment/query-status/:orderNo', auth, async (req, res) => {
    try {
        const { orderNo } = req.params;
        const order = await Order.findOne({ orderNo: orderNo, userId: req.userId });

        if (!order) {
            return res.status(404).json({ message: '订单不存在' });
        }
        
        res.status(200).json({ status: order.status });
    } catch (error) {
        console.error('查询订单状态失败:', error);
        res.status(500).json({ message: '服务器查询订单状态失败' });
    }
});
*/

// --- 黄历 API (使用 solarlunar 库) ---
app.get('/api/almanac', (req, res) => {
  try {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    const solarData = solarlunar.solar2lunar(year, month, day);

    // 优先显示农历节日，如果没有，则显示公历节日
    const festival = solarData.lunarFestival || solarData.festival || '';

    const responseData = {
      lunarDate: `农历 ${solarData.monthCn}${solarData.dayCn}`,
      festival: festival,
      ganzhi: `${solarData.gzYear}年 ${solarData.gzMonth}月 ${solarData.gzDay}日`,
      jieqi: solarData.term || ''
    };

    res.status(200).json(responseData);

  } catch (error) {
    console.error('生成农历数据失败:', error);
    res.status(500).json({ message: '服务器生成农历数据失败' });
  }
});


app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
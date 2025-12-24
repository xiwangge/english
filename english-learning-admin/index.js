import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { fileURLToPath } from 'url';
import path from 'path';
import adminRoutes from './adminRoutes.js';
import Product from '@english-learning/common/models/Product.js';

// --- ES Modules 路径处理 ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// ----------------------------

const app = express();
const port = 5003; // 为管理后台使用一个新端口

app.use(cors());
app.use(express.json());

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));

// --- MongoDB 连接 ---
mongoose.connect(process.env.mongoURI, {
})
.then(() => {
  console.log('Admin MongoDB connected');
  initializeProducts(); // 初始化产品数据
})
.catch(err => console.error('Admin MongoDB connection error:', err));
// --------------------

// 初始化产品数据函数
async function initializeProducts() {
  try {
    const products = [
      { type: 'monthly', name: '月度会员', price: 22, description: ['所有课程免费学', '解锁全部头像', '专属学习报告'] },
      { type: 'quarterly', name: '季度会员', price: 63, description: ['所有课程免费学', '解锁全部头像', '专属学习报告', '好友邀请奖励翻倍'] },
      { type: 'yearly', name: '年度会员', price: 188, description: ['所有课程免费学', '解锁全部头像', '专属学习报告', '好友邀请奖励翻倍', '专属客服支持'] }
    ];

    for (const product of products) {
      await Product.findOneAndUpdate(
        { type: product.type },
        { $setOnInsert: product },
        { upsert: true, new: true }
      );
    }
    console.log('产品数据初始化或验证成功。');
  } catch (error) {
    console.error('初始化产品数据失败:', error);
  }
}

// API 路由
app.use('/api', adminRoutes);

app.listen(port, () => {
  console.log(`Admin server listening on port ${port}`);
});
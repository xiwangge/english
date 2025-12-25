import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import WXPay from 'wechatpay-node-v3';

// Import common models
import Product from '@english-learning/common/models/Product.js';
import Order from '@english-learning/common/models/Order.js';
import User from '@english-learning/common/models/User.js';

// --- Basic Setup ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = 5002; // Use a different port for the international server

app.use(cors());
app.use(express.json());

// --- MongoDB Connection ---
mongoose.connect(process.env.mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('International MongoDB connected'))
.catch(err => console.error('International MongoDB connection error:', err));

// --- Auth Middleware (A simplified version for now) ---
const auth = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, process.env.token_secretKey);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};


// --- Products API ---
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find().sort({ price: 1 });
        res.status(200).json(products);
    } catch (error) {
        console.error('Failed to get products:', error);
        res.status(500).json({ message: 'Server failed to get products' });
    }
});

// --- WeChat Pay API ---

const pay = new WXPay({
  appid: process.env.H5_APPID,
  mchid: process.env.MCHID,
  publicKey: fs.readFileSync(path.resolve(__dirname, '../../cert/apiclient_cert.pem')),
  privateKey: fs.readFileSync(path.resolve(__dirname, '../../cert/apiclient_key.pem')),
});

// 1. Create Native Payment Order
app.post('/api/payment/create-native', auth, async (req, res) => {
    try {
        const { productType } = req.body;
        const userId = req.userId;

        const product = await Product.findOne({ type: productType });
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const orderNo = `BUBU_INTL_${Date.now()}${Math.random().toString().slice(2, 8)}`;
        
        const newOrder = new Order({
            orderNo,
            userId,
            productId: product._id,
            amount: product.price,
            status: 'pending',
        });
        await newOrder.save();

        const params = {
            description: `Bubu English - ${product.name}`,
            out_trade_no: orderNo,
            notify_url: 'https://international.xuebubu.com/api/payment/webhook', // Different notify URL
            amount: {
                total: Math.round(product.price * 100),
            },
        };

        const result = await pay.transactions_native(params);
        res.status(200).json({ codeUrl: result.data.code_url, orderNo });

    } catch (error) {
        console.error('Failed to create WeChat Pay order:', error);
        res.status(500).json({ message: 'Failed to create payment order' });
    }
});

// 2. Payment Webhook
app.post('/api/payment/webhook', async (req, res) => {
    try {
        const { resource } = req.body;
        if (!resource) throw new Error('Invalid webhook request body');
        
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
                    console.log(`Webhook: Order ${out_trade_no} not found or already processed.`);
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
        
        res.status(200).send();
    } catch (error) {
        console.error('WeChat Pay webhook failed:', error);
        res.status(500).send({ message: 'Webhook processing failed' });
    }
});

// 3. Query Order Status
app.get('/api/payment/query-status/:orderNo', auth, async (req, res) => {
    try {
        const { orderNo } = req.params;
        const order = await Order.findOne({ orderNo: orderNo, userId: req.userId });

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        
        res.status(200).json({ status: order.status });
    } catch (error) {
        console.error('Failed to query order status:', error);
        res.status(500).json({ message: 'Server failed to query order status' });
    }
});


app.listen(port, () => {
  console.log(`International server listening on port ${port}`);
});
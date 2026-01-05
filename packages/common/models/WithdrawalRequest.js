import mongoose from 'mongoose';

const withdrawalRequestSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'completed'], default: 'pending' },
    paymentMethod: { type: String, required: true },
    paymentDetails: {
        accountName: String,
        bankName: String,
        cardNumber: String,
        alipayAccount: String
    },
    adminNotes: String, // 管理员备注（如有驳回原因等）
    processedAt: Date
}, { timestamps: true, collection: 'withdrawal_requests' });

const WithdrawalRequest = mongoose.model('WithdrawalRequest', withdrawalRequestSchema);

export default WithdrawalRequest;

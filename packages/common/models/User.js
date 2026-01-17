import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true }, // 邮箱或微信ID
  nickname: { type: String },
  avatar: { type: String, default: 'bubu.png' }, // 默认头像
  loginType: { type: String, enum: ['email', 'wechat'], required: true }, // 注册渠道
  wechatId: { type: String }, // 微信ID，如果使用微信登录 (OpenID)
  unionid: { type: String, sparse: true, index: true }, // 微信UnionID，用于跨应用唯一识别用户
  sex: { type: Number, default: 0 }, // 性别 (1:男, 2:女, 0:未知)
  email: { type: String }, // 邮箱，如果使用邮箱登录
  city: { type: String },
  subscriptionExpiry: { type: Date, default: null }, // 订阅到期时间
  invitationCode: { type: String, unique: true }, // 邀请码
  invitedCount: { type: Number, default: 0 }, // 成功邀请的新用户数量
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // 邀请者
  userType: { type: String, enum: ['normal', 'admin', 'support'], default: 'normal' }, // 用户类型：normal-普通用户, admin-系统管理员, support-客服
  credits: { type: Number, default: 0 }, // 学分
  golds: { type: Number, default: 0 }, // 金币
  balance: { type: Number, default: 0 }, // 推广奖励余额 (GBP/CNY)
  paymentInfo: {
    method: { type: String, enum: ['none', 'bank', 'wechat'], default: 'none' },
    accountName: { type: String }, // 开户姓名
    bankName: { type: String }, // 银行名称
    cardNumber: { type: String }, // 银行卡号
    alipayAccount: { type: String } // 支付宝账号或手机号
  },
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null }, // 所属群组
  preferredTeacher: { type: mongoose.Schema.Types.ObjectId, ref: 'VoiceTeacher', default: null }, // 偏好的发音老师
  activeSessionId: { type: String, default: null }, // 当前有效的会话ID
  lastLoginIP: { type: String, default: null } // 上次登录IP
}, { timestamps: true, collection: 'users' });

const User = mongoose.model('User', userSchema);

export default User;
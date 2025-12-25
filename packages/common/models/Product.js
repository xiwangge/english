import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  // 'monthly', 'quarterly', 'yearly'
  type: {
    type: String,
    required: true,
    unique: true,
    enum: ['monthly', 'quarterly', 'yearly']
  },
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  description: [String] // 特性列表
}, {
  timestamps: true
});

const Product = mongoose.model('Product', productSchema);

export default Product;
const mongoose = require("mongoose");


const saleSchema = mongoose.Schema({
  userId: { type: String, required: true, index: true },
  brand: { type: String, required: true },
  earning: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },
  advancePaid: {
    type: Boolean,
    default: false
  },
  advanceAmount: { type: Number, default: 0 },
  reconciledAt: { type: Date, default: null }
}, {
    timestamps: true
});

saleSchema.index({ status: 1, advancePaid: 1});

module.exports = mongoose.model('Sale', saleSchema);
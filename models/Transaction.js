const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    userId: {
        type: String, required: true, index: true
    },
    saleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sale',
        default: null,
    },
    type: {
        type: String,
        enum: ['advance', 'final_adjustment', 'withdrawal'],
        require: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        enum: ['pending', 'success', 'failed', 'cancelled'],
        default: 'success'
    }
},{
    timestamps: true
});

module.exports = mongoose.model("Transaction", transactionSchema);
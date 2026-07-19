const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true
    },
    withdrawableBalance: { 
        type: Number,
        default: 0
    },
    lastWithdrawalAt: {
        type: Date,
        default: null,
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("User", userSchema);
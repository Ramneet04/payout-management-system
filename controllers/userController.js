const User = require('../models/User');
const Transaction = require('../models/Transaction');

async function createUser(req, res) {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ message: 'userId is required', success:false });
    }

    const existingUser = await User.findOne({ userId });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists', success:false });
    }

    const user = await User.create({ userId });
    res.status(201).json({
        user, success:true,message:"user created successfully"
    });
  } catch (error) {
    res.status(500).json({ message: error.message, success:false });
  }
}
async function getBalance(req,res){
    try {
        const user = await User.findOne({userId: req.params.userId});
        if (!user){
            return res.status(404).json({
                message:"user not registered",
                success:false
                });
        }
        res.status(200).json({
            userId:user.userId,
            withdrawableBalance: user.withdrawableBalance,
            lastWithdrawalAt: user.lastWithdrawalAt,
            message:"balance fetched successfully",
            success:true
        });
    } catch (error) {
        return res.status(500).json({
            message:error.message,
            success:false
        });
    }
}
async function getTransactions(req,res){
    try {
        const txns = await Transaction.find({userId: req.params.userId}).sort({createdAt: -1});
        res.status(200).json({
            txns,
            success:true,
            message:"transaction fetched successfully"
        });
    } catch (error) {
        return res.status(500).json({
            message:error.message,
            success:false
        });
    }
}

module.exports = {createUser, getBalance, getTransactions};
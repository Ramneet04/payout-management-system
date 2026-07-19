const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { default: mongoose } = require('mongoose');

const ONE_DAY = 24 * 60 * 60 * 1000;

async function requestWithdrawal(req,res){
    try {
        const {userId, amount} = req.body;
        if (!userId || !amount || amount <= 0) {
            return res.status(400).json({ message: 'userId and a positive amount are required', success:false });
        }
        const session = await mongoose.startSession();
        try {
            session.startTransaction();
            const user = await User.findOne({userId}).session(session);
            if (!user){
                await session.abortTransaction();
                return res.status(404).json({ message: 'User not found', success:false });
            } 
    
            const cutoff = new Date(Date.now() - ONE_DAY);

            const updatedUser = await User.findOneAndUpdate({
                userId,
                withdrawableBalance: {$gte: amount},
                $or: [
                    {lastWithdrawalAt: null},
                    {lastWithdrawalAt: {$lte: cutoff}}
                ]
            },{
                $inc: {withdrawableBalance: -amount},
                $set: {lastWithdrawalAt: new Date()}
            }, {
                new:true, session
            })

            if(!updatedUser){
                await session.abortTransaction();
                if (amount > user.withdrawableBalance) {
                    return res.status(400).json({ message: 'Insufficient withdrawable balance', success:false });
                }
                const elapsed = Date.now() - user.lastWithdrawalAt.getTime();
                const hoursLeft = ((ONE_DAY - elapsed) / (1000 * 60 * 60)).toFixed(1);
                // to many request
                return res.status(429).json({ message: `Only one withdrawal every 24 hours. Try again in ${hoursLeft}h.`, success:false });
            }

            const [txn] = await Transaction.create(
            [{
              userId,
              type: 'withdrawal',
              amount: -amount,
              status: 'pending' 
            }],
            { session });
            await session.commitTransaction();
            res.status(201).json({ message: 'Withdrawal initiated', transaction: txn, success:true });
        } catch (error) {
            await session.abortTransaction();
            res.status(500).json({ message: error.message, success:false });
        } finally{
            await session.endSession();
        }
    } catch (error) {
        return res.status(500).json({
            message: error.message,
            success: false
        })
    }
}

async function resolveWithdrawal(req, res) {
  const { outcome } = req.body;
  if (!['success', 'failed', 'cancelled'].includes(outcome)) {
    return res.status(400).json({ message: "outcome must be 'success', 'failed', or 'cancelled'", success:false });
  }

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: 'Invalid transaction id', success:false});
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const txn = await Transaction.findOneAndUpdate(
      { _id: req.params.id, type: 'withdrawal', status: 'pending' },
      { $set: { status: outcome } },
      { new: true, session }
    );

    if (!txn) {
      await session.abortTransaction();
      const existing = await Transaction.findById(req.params.id);
      if (!existing || existing.type !== 'withdrawal') {
        return res.status(404).json({ message: 'Withdrawal transaction not found', success:false });
      }
      return res.status(409).json({ message: `Transaction already resolved as '${existing.status}'`, success:false });
    }

    if (outcome !== 'success') {
      const refundAmount = Math.abs(txn.amount);
      const user = await User.findOneAndUpdate(
        { userId: txn.userId },
        { $inc: { withdrawableBalance: refundAmount }, $set: { lastWithdrawalAt: null } },
        { new: true, session }
      );
      await session.commitTransaction();
      return res.json({ message: `Withdrawal ${outcome}, amount refunded`, user, transaction: txn });
    }

    await session.commitTransaction();
    res.status(200).json({ message: 'Withdrawal marked successful', transaction: txn, success:true });
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ message: err.message, success:false });
  } finally {
    session.endSession();
  }
}

module.exports = {requestWithdrawal, resolveWithdrawal};
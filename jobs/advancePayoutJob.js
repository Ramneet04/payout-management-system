const mongoose = require('mongoose');
const Sale = require('../models/Sale');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

async function runAdvancePayoutJob(){

    const pending_sales = await Sale.find({status: "pending", advancePaid: false});

    const results = [];

    for(const sale of pending_sales){
        const advanceAmount = +(sale.earning * 0.10).toFixed(2);

        const session = await mongoose.startSession();
        try {
            session.startTransaction();

            await Transaction.create([
                {
                    userId: sale.userId,
                    saleId: sale._id,
                    status: 'success',
                    amount: advanceAmount,
                    type: "advance"
                }
            ],{
                session
            });

            await User.findOneAndUpdate({userId: sale.userId},{
                $inc: {
                    withdrawableBalance: advanceAmount
                }
            }, {upsert: true, session});

            sale.advancePaid = true;
            sale.advanceAmount=advanceAmount;
            await sale.save({session});

            await session.commitTransaction();

            results.push({saleId: sale._id, userId: sale.userId, advanceAmount});
        } catch (error) {
            await session.abortTransaction();
            console.log("error while making advance payouts", error.message);
        } finally{
            session.endSession();
        }
    }
    return results;
}

module.exports = runAdvancePayoutJob;
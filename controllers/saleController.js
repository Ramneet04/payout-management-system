const User = require("../models/User");
const Sale = require("../models/Sale");
const Transaction = require('../models/Transaction');
const mongoose= require("mongoose");

async function createSale(req,res) {
    try {
        const {userId, brand, earning} = req.body;
    if (!userId || !brand || earning === undefined) {
      return res.status(400).json({ error: 'userId, brand, and earning are required' });
    }
    if (earning <= 0) {
      return res.status(400).json({ error: 'earning must be positive' });
    }

    const sale = await Sale.create({
        userId,
        brand,
        earning,
        status: "pending"
    });

    const user = await User.findOne({userId});

    if(!user){
        await User.create({
            userId,
            withdrawableBalance: 0,
        });
    }

    return res.status(201).json({
        success: true,
        message:"sale created successfully",
        sale
    })
    } catch (error) {
        res.status(500).json({
            success:false,
            message: "sale creation failed",
            error: error.message
        })
    }
};

async function getSales(req,res){
    try {
        const filter = {};
        if(req.query.userId){
            filter.userId=req.query.userId;
        }
        if(req.query.status){
            filter.status=req.query.status;
        } 
        const sales = await Sale.find(filter).sort({createdAt:-1});
    
        return res.status(200).json({
            message:"sale fetched successfully",
            success:true,
            sales
        })
    } catch (error) {
        return res.status(500).json({
            message:"trouble fecthing sales",
            success:false
        })
    }
};

async function reconcileSale(req,res){

    try {
        const {status} = req.body;

    if(!['approved', 'rejected'].includes(status)){
        return res.status(400).json({ 
            message:"needs a valid status",
            success:false,
         });
    }
    const id=req.params.id;

    const sale = await Sale.findOneAndUpdate(
        { _id: sale._id, status: 'pending' },
        { $set: { status, reconciledAt: new Date() } },
        { new: true, session }
    );
    if (!sale) {
      await session.abortTransaction();
      return res.status(409).json({ message: "sale is already reconciled", success: false });
    }

    const session = await mongoose.startSession();
    try {

        session.startTransaction();

        const finalReconcileAmount= status === "approved" ?
        Number((sale.earning - sale.advanceAmount).toFixed(2)):
        Number((-sale.advanceAmount).toFixed(2));

        await Transaction.create([{
            userId: sale.userId,
            saleId: sale._id,
            type: "final_adjustment",
            status:"success",
            amount: finalReconcileAmount
        }], {session})

       const user = await User.findOne({userId: sale.userId});
       await User.findOneAndUpdate(
        { userId: sale.userId },
        { $inc: { withdrawableBalance: finalReconcileAmount } },
        { upsert: true, session });

       sale.status=status;
       sale.reconciledAt=new Date();
       await sale.save({session});
       await session.commitTransaction();
       res.status(200).json({
        success:true,
        message:"reconcile done successfully",
        sale,
        finalAdjustment: finalReconcileAmount
       });

    } catch (error) {
        await session.abortTransaction();
        res.status(500).json({
            success:false,
            message:error.message
        })
    } finally{
        await session.endSession();
    }
    } catch (error) {
        res.status(500).json({
            success:false,
            message:error.message
        })
    }

}

module.exports = {createSale, getSales, reconcileSale};
const express = require('express');
const router = express.Router();

const saleRoutes = require("./saleRoutes");
const userRoutes = require('./userRoutes');
const jobRoutes = require('./jobRoutes');
const withdrawalRoutes = require("./withdrawalRoutes");

router.use("/sales",saleRoutes);
router.use("/users",userRoutes);
router.use("/jobs", jobRoutes);
router.use("/withdrawals",withdrawalRoutes);
module.exports = router;
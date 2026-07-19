const express = require('express');
const router = express.Router();
const withdrawalController = require('../controllers/withdrawalController');
router.post("/", withdrawalController.requestWithdrawal);
router.post("/:id/resolve", withdrawalController.resolveWithdrawal);

module.exports = router;
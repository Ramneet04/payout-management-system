const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.post("/", userController.createUser);
router.get("/:userId/balance", userController.getBalance);
router.get("/:userId/transactions", userController.getTransactions);

module.exports = router;
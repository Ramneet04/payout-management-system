const express = require("express");
const router = express.Router();
const jobController = require("../controllers/jobController");

router.post("/run-advance-payout", jobController.triggerAdvancePayoutJob);

module.exports = router;

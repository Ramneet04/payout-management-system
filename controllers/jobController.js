const runAdvancePayoutJob = require("../jobs/advancePayoutJob");


async function triggerAdvancePayoutJob(req,res){
    try {
        const results = await runAdvancePayoutJob();
        return res.status(200).json({message: `Processed ${results.length} sale(s)`, results})
    } catch (error) {
        return res.status(500).json({
            error: error.message
        })
    }
}

module.exports = {triggerAdvancePayoutJob};

const express = require("express");
const Budget = require("../models/Budget");
const Expense = require("../models/Expense");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

// Validate month format and calculate its date range.
function getMonthRange(month) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return null;
  }

  const [year, monthNumber] = month.split("-").map(Number);

  return {
    start: new Date(Date.UTC(year, monthNumber - 1, 1)),
    end: new Date(Date.UTC(year, monthNumber, 1)),
  };
}

// Get a month's budget and spending summary.
router.get("/:month", async (req, res) => {
  try {
    const range = getMonthRange(req.params.month);

    if (!range) {
      return res.status(400).json({ message: "Invalid month. Use YYYY-MM." });
    }

    const budget = await Budget.findOne({
      user: req.user._id,
      month: req.params.month,
    });

    const result = await Expense.aggregate([
      {
        $match: {
          user: req.user._id,
          date: { $gte: range.start, $lt: range.end },
        },
      },
      {
        $group: {
          _id: null,
          totalSpent: { $sum: "$amount" },
        },
      },
    ]);

    const totalSpent = result[0]?.totalSpent || 0;
    const budgetAmount = budget?.amount || 0;
    const remaining = budgetAmount - totalSpent;

    let status = "within";

    if (budgetAmount > 0 && totalSpent > budgetAmount) {
      status = "over";
    } else if (
      budgetAmount > 0 &&
      totalSpent >= budgetAmount * 0.8
    ) {
      status = "approaching";
    } else if (budgetAmount === 0) {
      status = "not-set";
    }

    return res.json({
      month: req.params.month,
      budget: budgetAmount,
      totalSpent,
      remaining,
      status,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to retrieve budget." });
  }
});

// Create or update the user's budget for a month.
router.put("/:month", async (req, res) => {
  try {
    const range = getMonthRange(req.params.month);

    if (!range) {
      return res.status(400).json({ message: "Invalid month. Use YYYY-MM." });
    }

    const amount = Number(req.body.amount);

    if (
      req.body.amount === undefined ||
      req.body.amount === null ||
      req.body.amount === "" ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return res.status(400).json({
        message: "Budget amount must be a number greater than zero.",
      });
    }

    const budget = await Budget.findOneAndUpdate(
      {
        user: req.user._id,
        month: req.params.month,
      },
      {
        $set: { amount },
        $setOnInsert: {
          user: req.user._id,
          month: req.params.month,
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

    return res.json({
      message: "Monthly budget saved successfully.",
      budget,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "A budget for this month already exists. Please try again.",
      });
    }

    return res.status(500).json({ message: "Failed to save budget." });
  }
});

module.exports = router;

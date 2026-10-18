
const express = require("express");
const User = require("../models/User");
const Expense = require("../models/Expense");
const Category = require("../models/Category");
const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect, adminOnly);

router.get("/insights", async (req, res) => {
  try {
    const now = new Date();

    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
    );

    const nextMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)
    );

    const [
      registeredUsers,
      expenseCount,
      totalResult,
      currentMonthExpenseCount,
      categoryList,
      categoryResults,
      recentExpenses,
      recentUsers,
    ] = await Promise.all([
      User.countDocuments(),
      Expense.countDocuments(),

      Expense.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
          },
        },
      ]),

      Expense.countDocuments({
        date: { $gte: monthStart, $lt: nextMonth },
      }),

      Category.find().select("name"),

      Expense.aggregate([
        {
          $group: {
            _id: "$category",
            usageCount: { $sum: 1 },
            totalSpent: { $sum: "$amount" },
          },
        },
      ]),

      Expense.find()
        .populate("user", "name email")
        .sort({ createdAt: -1 })
        .limit(10)
        .select("title amount category date user createdAt"),

      User.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .select("name email role createdAt"),
    ]);

    const usageMap = new Map(
      categoryResults.map((item) => [item._id, item])
    );

    // Include categories even if nobody has used them yet.
    const spendingByCategory = categoryList.map((category) => {
      const usage = usageMap.get(category.name);

      return {
        category: category.name,
        usageCount: usage?.usageCount || 0,
        totalSpent: usage?.totalSpent || 0,
      };
    });

    const sortedCategories = [...spendingByCategory].sort(
      (a, b) =>
        b.usageCount - a.usageCount ||
        a.category.localeCompare(b.category)
    );

    const totalExpenseValue = totalResult[0]?.total || 0;

    return res.json({
      registeredUsers,
      expenseCount,
      totalExpenseValue,
      currentMonthExpenseCount,
      spendingByCategory,
      topFiveCategories: sortedCategories.slice(0, 5),
      bottomFiveCategories: [...sortedCategories].reverse().slice(0, 5),
      recentExpenses,
      recentUsers,
    });
  } catch (error) {
    console.error("Admin insights error:", error);
    return res.status(500).json({
      message: "Failed to retrieve admin insights.",
    });
  }
});

module.exports = router;


const express = require("express");
const mongoose = require("mongoose");
const Expense = require("../models/Expense");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// All expense routes require a signed-in user
router.use(protect);

// Get the signed-in user's expenses
router.get("/", async (req, res) => {
  try {
    const filters = { user: req.user._id };

    if (req.query.category && typeof req.query.category !== "string") {
      return res.status(400).json({ message: "category must be a single value." });
    }
    if (req.query.category) {
      filters.category = req.query.category;
    }

    const paymentMethods = ["Cash", "Card", "Bank Transfer", "Mobile Money", "Other"];
    if (req.query.paymentMethod && !paymentMethods.includes(req.query.paymentMethod)) {
      return res.status(400).json({ message: "Invalid paymentMethod." });
    }
    if (req.query.paymentMethod) {
      filters.paymentMethod = req.query.paymentMethod;
    }

    if (req.query.search) {
      if (typeof req.query.search !== "string") {
        return res.status(400).json({ message: "search must be a single value." });
      }
      const search = req.query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filters.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
      ];
    }

    if (req.query.startDate || req.query.endDate) {
      const dateFilter = {};
      if (req.query.startDate) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(req.query.startDate)) {
          return res.status(400).json({ message: "startDate must use YYYY-MM-DD." });
        }
        const startDate = new Date(`${req.query.startDate}T00:00:00.000Z`);
        if (Number.isNaN(startDate.getTime()) || startDate.toISOString().slice(0, 10) !== req.query.startDate) {
          return res.status(400).json({ message: "Invalid startDate." });
        }
        dateFilter.$gte = startDate;
      }
      if (req.query.endDate) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(req.query.endDate)) {
          return res.status(400).json({ message: "endDate must use YYYY-MM-DD." });
        }
        const endDate = new Date(`${req.query.endDate}T00:00:00.000Z`);
        if (Number.isNaN(endDate.getTime()) || endDate.toISOString().slice(0, 10) !== req.query.endDate) {
          return res.status(400).json({ message: "Invalid endDate." });
        }
        endDate.setUTCDate(endDate.getUTCDate() + 1);
        dateFilter.$lt = endDate;
      }
      if (dateFilter.$gte && dateFilter.$lt && dateFilter.$gte >= dateFilter.$lt) {
        return res.status(400).json({ message: "startDate must be on or before endDate." });
      }
      filters.date = dateFilter;
    }

    const sortOptions = {
      newest: { date: -1 },
      oldest: { date: 1 },
      "amount-high": { amount: -1 },
      "amount-low": { amount: 1 },
    };
    if (req.query.sort && (typeof req.query.sort !== "string" || !Object.hasOwn(sortOptions, req.query.sort))) {
      return res.status(400).json({ message: "Invalid sort order." });
    }
    const sort = req.query.sort ? sortOptions[req.query.sort] : sortOptions.newest;
    const paginated = req.query.page !== undefined || req.query.limit !== undefined;

    if (paginated) {
      const page = Number(typeof req.query.page === "string" ? req.query.page : 1);
      const limit = Number(typeof req.query.limit === "string" ? req.query.limit : 10);
      if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
        return res.status(400).json({
          message: "page must be a positive integer and limit must be between 1 and 100.",
        });
      }

      const [expenses, totalItems] = await Promise.all([
        Expense.find(filters).sort(sort).skip((page - 1) * limit).limit(limit),
        Expense.countDocuments(filters),
      ]);
      return res.json({
        expenses,
        pagination: {
          page,
          limit,
          totalItems,
          totalPages: Math.max(1, Math.ceil(totalItems / limit)),
        },
      });
    }

    const expenses = await Expense.find(filters).sort(sort);

    res.json(expenses);
  } catch (error) {
    console.error("Get expenses error:", error.message);
    res.status(500).json({ message: "Unable to retrieve expenses." });
  }
});

// Create an expense
router.post("/", async (req, res) => {
  try {
    const {
      title,
      description,
      amount,
      category,
      date,
      paymentMethod,
      notes,
    } = req.body;

    if (
      !title?.trim() ||
      amount === undefined ||
      amount === null ||
      amount === "" ||
      !category?.trim() ||
      !date ||
      !paymentMethod
    ) {
      return res.status(400).json({
        message: "Please provide all required expense fields.",
      });
    }

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        message: "Amount must be a number greater than zero.",
      });
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        message: "Please provide a valid expense date.",
      });
    }

    const expense = await Expense.create({
      user: req.user._id,
      title: title.trim(),
      description: description?.trim() || "",
      amount: numericAmount,
      category: category.trim(),
      date: parsedDate,
      paymentMethod,
      notes: notes?.trim() || "",
    });

    res.status(201).json({
      message: "Expense created successfully.",
      expense,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    console.error("Create expense error:", error.message);
    res.status(500).json({ message: "Unable to create expense." });
  }
});

// Update an expense belonging to the signed-in user
router.put("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid expense ID." });
    }

    const allowedFields = [
      "title",
      "description",
      "amount",
      "category",
      "date",
      "paymentMethod",
      "notes",
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "Provide at least one field to update.",
      });
    }

    if (
      ("title" in updates && !updates.title?.trim()) ||
      ("category" in updates && !updates.category?.trim())
    ) {
      return res.status(400).json({
        message: "Title, description, and category cannot be empty.",
      });
    }

    if ("amount" in updates) {
      const numericAmount = Number(updates.amount);

      if (
        updates.amount === "" ||
        updates.amount === null ||
        !Number.isFinite(numericAmount) ||
        numericAmount <= 0
      ) {
        return res.status(400).json({
          message: "Amount must be a number greater than zero.",
        });
      }

      updates.amount = numericAmount;
    }

    if ("date" in updates) {
      const parsedDate = new Date(updates.date);

      if (!updates.date || Number.isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          message: "Please provide a valid expense date.",
        });
      }

      updates.date = parsedDate;
    }

    for (const field of ["title", "description", "category", "notes"]) {
      if (typeof updates[field] === "string") {
        updates[field] = updates[field].trim();
      }
    }

    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!expense) {
      return res.status(404).json({
        message: "Expense not found.",
      });
    }

    res.json({
      message: "Expense updated successfully.",
      expense,
    });
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ message: error.message });
    }

    console.error("Update expense error:", error.message);
    res.status(500).json({ message: "Unable to update expense." });
  }
});

// Delete an expense belonging to the signed-in user
router.delete("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid expense ID." });
    }

    const expense = await Expense.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!expense) {
      return res.status(404).json({
        message: "Expense not found.",
      });
    }

    res.json({ message: "Expense deleted successfully." });
  } catch (error) {
    console.error("Delete expense error:", error.message);
    res.status(500).json({ message: "Unable to delete expense." });
  }
});

module.exports = router;

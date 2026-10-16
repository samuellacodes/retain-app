
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
    const expenses = await Expense.find({ user: req.user._id })
      .sort({ date: -1 });

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
      !description?.trim() ||
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
      description: description.trim(),
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
      ("description" in updates && !updates.description?.trim()) ||
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

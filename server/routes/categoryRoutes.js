
const express = require("express");
const mongoose = require("mongoose");
const Category = require("../models/Category");
const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

// All logged-in users can retrieve categories.
router.get("/", async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    return res.json(categories);
  } catch (error) {
    return res.status(500).json({ message: "Failed to retrieve categories." });
  }
});

// Only administrators can create categories.
router.post("/", adminOnly, async (req, res) => {
  try {
    const name = req.body.name?.trim();

    if (!name) {
      return res.status(400).json({ message: "Category name is required." });
    }

    const category = await Category.create({
      name,
      description: req.body.description || "",
    });

    return res.status(201).json(category);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "This category already exists." });
    }

    return res.status(500).json({ message: "Failed to create category." });
  }
});

// Only administrators can update categories.
router.put("/:id", adminOnly, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid category ID." });
    }

    const updates = {};

    if (req.body.name !== undefined) {
      const name = req.body.name.trim();

      if (!name) {
        return res.status(400).json({ message: "Category name cannot be empty." });
      }

      updates.name = name;
    }

    if (req.body.description !== undefined) {
      updates.description = req.body.description;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "Provide a field to update." });
    }

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({ message: "Category not found." });
    }

    return res.json(category);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "This category already exists." });
    }

    return res.status(500).json({ message: "Failed to update category." });
  }
});

// Only administrators can delete categories.
router.delete("/:id", adminOnly, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid category ID." });
    }

    const category = await Category.findByIdAndDelete(req.params.id);

    if (!category) {
      return res.status(404).json({ message: "Category not found." });
    }

    return res.json({ message: "Category deleted successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete category." });
  }
});

module.exports = router;

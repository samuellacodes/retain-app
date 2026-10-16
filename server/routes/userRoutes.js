
const express = require("express");
const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

// Any signed-in user can access this route
router.get("/me", protect, (req, res) => {
  res.json({
    message: "You are authenticated.",
    user: req.user,
  });
});

// Only administrators can access this route
router.get("/admin-test", protect, adminOnly, (req, res) => {
  res.json({
    message: "Administrator access confirmed.",
  });
});

module.exports = router;

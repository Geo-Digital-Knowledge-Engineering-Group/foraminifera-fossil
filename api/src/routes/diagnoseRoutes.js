const express = require("express");
const router = express.Router();
const diagnoseController = require("../controllers/diagnoseController");

// Module entry question (first question of a tree branch)
router.post("/question/entry", diagnoseController.questionEntry);

// Step-by-step decision tree walk
router.post("/question", diagnoseController.question);

// Full scoring engine (M/D/S/C)
router.post("/score", diagnoseController.score);

// Legacy genus list
router.post("/", diagnoseController.diagnose);

module.exports = router;

const express = require("express");
const router = express.Router();
const vlmController = require("../controllers/vlmController");

router.get("/status", vlmController.status);
router.post("/observe", vlmController.observe);

module.exports = router;

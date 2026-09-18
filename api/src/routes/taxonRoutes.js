const express = require("express");
const router = express.Router();
const taxonController = require("../controllers/taxonController");

// Combined WoRMS taxonomy + local environment profile
router.get("/profile", taxonController.getProfile);

// Local environment records with search & filter
router.get("/environment", taxonController.getEnvironment);

module.exports = router;

const express = require("express");
const cors = require("cors");

const healthRoutes = require("./routes/healthRoutes");
const diagnoseRoutes = require("./routes/diagnoseRoutes");
const vlmRoutes = require("./routes/vlmRoutes");
const taxonRoutes = require("./routes/taxonRoutes");

const app = express();

app.use(cors());
app.use(express.json({ limit: "12mb" }));

app.use("/api/health", healthRoutes);
app.use("/api/diagnose", diagnoseRoutes);
app.use("/api/vlm", vlmRoutes);
app.use("/api/taxa", taxonRoutes);

module.exports = app;
require("dotenv").config();

const app = require("./src/app");

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", function () {
  console.log(
    `Foraminifera Fossil API is running on port ${PORT}`
  );
});
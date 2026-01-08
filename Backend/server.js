console.log("SERVER FILE:", __filename);
console.log("CWD:", process.cwd());
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const morgan = require("morgan");

const connectDB = require("./src/config/db");
const authRoutes = require("./src/routes/auth.routes");
const { notFound, errorHandler } = require("./src/middleware/errormiddleware");

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// DB
connectDB();

// Routes
app.use("/api/auth", authRoutes);

// Health check
app.get("/", (req, res) => res.json({ ok: true, message: "API running" }));

// Error middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

console.log("ABOUT TO LISTEN ON PORT:", PORT);

const server = app.listen(PORT, "127.0.0.1", () => {
  console.log(`✅ Listening at http://127.0.0.1:${PORT}`);
});

server.on("error", (err) => {
  console.error("❌ LISTEN ERROR:", err);
});



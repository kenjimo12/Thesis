const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    username: { type: String, required: true, unique: true, trim: true },
    studentNumber: { type: String, required: true, unique: true, trim: true },

    // ✅ Role-based access control (RBAC)
    role: {
      type: String,
      enum: ["Admin", "Consultant", "Student"],
      default: "Student",
      required: true,
    },

    // Local auth
    passwordHash: { type: String },

    // Optional for Google users
    googleId: { type: String },
    authProvider: { type: String, enum: ["local", "google"], default: "local" },
  },
  { timestamps: true }
);

// Compare password helper
userSchema.methods.matchPassword = async function (plainPassword) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(plainPassword, this.passwordHash);
};

module.exports = mongoose.model("User", userSchema);

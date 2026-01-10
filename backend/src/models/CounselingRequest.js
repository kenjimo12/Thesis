const mongoose = require("mongoose");

const CounselingRequestSchema = new mongoose.Schema(
  {
    // student who created it
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    type: { type: String, enum: ["ASK", "MEET"], required: true },

    status: {
      type: String,
      enum: ["Pending", "Approved", "Disapproved", "Cancelled", "Completed"],
      default: "Pending",
      index: true,
    },

    // ASK fields
    topic: { type: String, trim: true },
    message: { type: String, trim: true },
    anonymous: { type: Boolean, default: true },
    counselorReply: { type: String, trim: true },
    repliedAt: { type: Date },

    // MEET fields
    sessionType: { type: String, enum: ["Online", "In-person"] },
    reason: { type: String, trim: true },
    date: { type: String }, // YYYY-MM-DD (PH date)
    time: { type: String }, // HH:MM (24h)
    counselorId: { type: String, trim: true }, // keep string like "C-101" to match frontend
    notes: { type: String, trim: true },

    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    disapprovalReason: { type: String, trim: true },

    meetingLink: { type: String, trim: true },
    location: { type: String, trim: true },

    completedAt: { type: Date },
  },
  { timestamps: true }
);

// Prevent double-booking by counselor/date/time for MEET when pending/approved
CounselingRequestSchema.index(
  { counselorId: 1, date: 1, time: 1, type: 1, status: 1 },
  { partialFilterExpression: { type: "MEET", status: { $in: ["Pending", "Approved"] } } }
);

module.exports = mongoose.model("CounselingRequest", CounselingRequestSchema);

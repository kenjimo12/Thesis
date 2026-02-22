/**
 * One-time fixer: set User.fullName = `${firstName} ${lastName}` when first/last exist
 * and fullName looks like it was incorrectly set to username/email-prefix.
 *
 * Run:
 *   node scripts/fixUserFullNames.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../src/models/User.model");

function emailPrefix(email = "") {
  const s = String(email || "").trim().toLowerCase();
  return (s.split("@")[0] || "").trim();
}

async function main() {
  const uri =
    process.env.MONGO_URI ||
    process.env.MONGODB_URI ||
    process.env.MONGO_URL ||
    process.env.DB_URI;

  if (!uri) {
    console.error("❌ Missing MongoDB URI. Set MONGO_URI (or MONGODB_URI) in your .env");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("✅ Connected");

  const cursor = User.find(
    {
      firstName: { $exists: true, $ne: "" },
      lastName: { $exists: true, $ne: "" },
    },
    { firstName: 1, lastName: 1, fullName: 1, username: 1, email: 1 }
  ).cursor();

  let scanned = 0;
  let toFix = 0;

  const ops = [];

  for await (const u of cursor) {
    scanned += 1;

    const derived = `${u.firstName} ${u.lastName}`.replace(/\s+/g, " ").trim();
    if (!derived) continue;

    const current = String(u.fullName || "").trim();
    const currentLower = current.toLowerCase();

    const userLower = String(u.username || "").trim().toLowerCase();
    const emailPref = emailPrefix(u.email);

    const looksWrong =
      !current ||
      (userLower && currentLower === userLower) ||
      (emailPref && currentLower === emailPref) ||
      (!current.includes(" ") && derived.includes(" "));

    if (!looksWrong) continue;
    if (currentLower === derived.toLowerCase()) continue;

    toFix += 1;
    ops.push({
      updateOne: {
        filter: { _id: u._id },
        update: { $set: { fullName: derived } },
      },
    });

    if (ops.length >= 500) {
      await User.bulkWrite(ops);
      ops.length = 0;
    }
  }

  if (ops.length) await User.bulkWrite(ops);

  console.log(`🔎 Scanned: ${scanned}`);
  console.log(`🛠️  Fixed:  ${toFix}`);

  await mongoose.disconnect();
  console.log("✅ Done");
}

main().catch((e) => {
  console.error("❌ Script failed:", e);
  process.exit(1);
});

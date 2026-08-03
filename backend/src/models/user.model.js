const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password_hash: {
      type: String,
      required: true,
      alias: "passwordHash",
    },
    profile_image: {
      type: String,
      alias: "profileImage",
    },
    profile_color: {
      type: String,
      alias: "profileColor",
    },
    is_email_verified: {
      type: Boolean,
      default: false,
      alias: "isEmailVerified",
    },
    email_verification_token_hash: {
      type: String,
      select: false,
    },
    email_verification_expires: {
      type: Date,
      select: false,
    },
    password_reset_token_hash: {
      type: String,
      select: false,
    },
    password_reset_expires: {
      type: Date,
      select: false,
    },
    labels: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
);

const User = mongoose.model("User", userSchema);

module.exports = User;

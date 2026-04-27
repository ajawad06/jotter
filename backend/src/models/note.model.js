const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
      alias: "userId",
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    color: {
      type: String,
      trim: true,
      default: "#ffffff",
    },
    is_pinned: {
      type: Boolean,
      default: false,
      alias: "isPinned",
    },
    is_archived: {
      type: Boolean,
      default: false,
      alias: "isArchived",
    },
    is_trashed: {
      type: Boolean,
      default: false,
      alias: "isTrashed",
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
);

const Note = mongoose.model("Note", noteSchema);

module.exports = Note;

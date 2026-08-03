const mongoose = require("mongoose");

// `typeKey: "$type"` lets us have a field literally named `type` (the file's
// MIME type) without Mongoose mistaking the subdocument for a String type.
const attachmentSchema = new mongoose.Schema(
  {
    id: String,
    name: String,
    url: String,
    type: String,
    size: Number,
    publicId: String,
    resourceType: String,
  },
  { _id: false, typeKey: "$type" },
);

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
    },
    content_format: {
      type: String,
      enum: ["plain", "html", "markdown"],
      default: "plain",
      alias: "contentFormat",
    },
    color: {
      type: String,
      trim: true,
      default: "#ffffff",
    },
    labels: {
      type: [String],
      default: [],
      index: true,
    },
    attachments: {
      type: [attachmentSchema],
      default: [],
    },
    links: {
      type: [String],
      default: [],
    },
    reminder_at: {
      type: Date,
      alias: "reminderAt",
    },
    order: {
      type: Number,
      default: 0,
    },
    ai_summary: {
      type: String,
      alias: "aiSummary",
    },
    ai_title: {
      type: String,
      alias: "aiTitle",
    },
    smart_tags: {
      type: [String],
      default: [],
      alias: "smartTags",
    },
    extracted_tasks: {
      type: [String],
      default: [],
      alias: "extractedTasks",
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
    trashed_at: {
      type: Date,
      alias: "trashedAt",
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

const mongoose = require("mongoose");

const shareSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "project" },
  ownerId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "user" },
  userId: { type: mongoose.Schema.Types.ObjectId, default: null },
  permission: { type: String, enum: ['view', 'edit'], required: true },
  email: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  revokedAt: { type: Date, default: null },
});

shareSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

shareSchema.index({ projectId: 1, revokedAt: 1 });

module.exports = mongoose.model("share", shareSchema);

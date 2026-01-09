const mongoose = require("mongoose");

const shareSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "project" },
  ownerId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "user" },
  userId: { type: mongoose.Schema.Types.ObjectId, default: null }, // ID do colaborador que está recebendo acesso
  permission: { type: String, enum: ['view', 'edit'], required: true },
  email: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  revokedAt: { type: Date, default: null }, // null = ativo, preenchido = revogado
});

// Índice para limpeza automática de shares expirados
shareSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Índice para queries rápidas
shareSchema.index({ projectId: 1, revokedAt: 1 });

module.exports = mongoose.model("share", shareSchema);

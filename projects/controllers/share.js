const Share = require("../models/share");

module.exports.createShare = async (token, projectId, ownerId, permission, email, expiresAt) => {
  return await Share.create({
    token,
    projectId,
    ownerId,
    permission,
    email,
    expiresAt,
  });
};

module.exports.getShareByToken = async (token) => {
  return await Share.findOne({ token, revokedAt: null, expiresAt: { $gt: new Date() } });
};

module.exports.updateShareWithUserId = async (token, userId) => {
  return await Share.findOneAndUpdate(
    { token },
    { userId: userId },
    { new: true }
  );
};

module.exports.revokeShare = async (shareId) => {
  return await Share.findByIdAndUpdate(shareId, { revokedAt: new Date() }, { new: true });
};

module.exports.getProjectShares = async (projectId) => {
  return await Share.find({ projectId, revokedAt: null, expiresAt: { $gt: new Date() } })
    .select("_id email permission createdAt token")
    .sort({ createdAt: -1 });
};

module.exports.deleteAllProjectShares = async (projectId) => {
  return await Share.deleteMany({ projectId });
};

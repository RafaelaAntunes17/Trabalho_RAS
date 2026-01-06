var Project = require("../models/project");
var jwt = require("jsonwebtoken");

module.exports.getAll = async (user_id) => {
  return await Project.find({ $or:[
    {user_id: user_id},
    {collaborators: user_id}
  ]}).sort({_id: -1}).exec();
};

module.exports.getOne = async (user_id, project_id) => {
  return await Project.findOne({
    _id: project_id,
    $or: [
      { user_id: user_id },
      { collaborators: user_id }
    ]}).exec();
};

module.exports.create = async (project) => {
  return await Project.create(project);
};

module.exports.update = (user_id, project_id, project) => {
  return Project.updateOne({ user_id: user_id, _id: project_id }, project);
};

module.exports.delete = (user_id, project_id) => {
  return Project.deleteOne({ user_id: user_id, _id: project_id });
};

module.exports.generateShareToken = async(user_id, project_id) => {
  const project = await Project.findOne({ _id:project_id, user_id: user_id });
  if(!project) throw new Error("Projeto não encontrado");
  if(!project.isShareable) throw new Error("Projeto não compartilhável");

  return jwt.sign({project_id: project_id}, "SECRET_KEY", {expiresIn: "24h"});
};

module.exports.getSharedProject = async(user_id, token) => {
  try{
    const decoded = jwt.verify(token, "SECRET_KEY");
    const projectId = decoded.project_id;

    return await Project.findOneAndUpdate(
      {_id: projectId, user_id: { $ne: user_id } },
      {$addToSet: {collaborators: user_id}},
      {new: true}
      );
  }catch(err){
    throw new Error("Token inválido ou expirado");
  }
}

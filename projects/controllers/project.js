var Project = require("../models/project");
var Share = require("../controllers/share");
var jwt = require("jsonwebtoken");



module.exports.getAll = async (user_id) => {
  return await Project.find({ $or:[
    {user_id: user_id},
    {collaborators: { $elemMatch: { userId: user_id } }}
  ]}).sort({_id: -1}).exec();
};

module.exports.getOne = async (user_id, project_id) => {
  return await Project.findOne({
    _id: project_id,
    $or: [
      { user_id: user_id },
      { collaborators: { $elemMatch: { userId: user_id } } }
    ]}).exec();
};

module.exports.create = async (project) => {
  return await Project.create(project);
};

module.exports.update = (user_id, project_id, project) => {
  return Project.updateOne({
    $or: [{user_id: user_id}, {collaborators: { $elemMatch: { userId: user_id } }}],
    _id: project_id },
    project);
};

module.exports.delete = (user_id, project_id) => {
  return Project.deleteOne({ 
    user_id: user_id, 
    _id: project_id });
};

module.exports.deleteAllByUser = (user_id) => {
  return Project.deleteMany({ user_id: user_id });
};

module.exports.removeCollaboratorFromAll = (user_id) => {
  return Project.updateMany(
    { "collaborators.userId": user_id },
    { $pull: { collaborators: { userId: user_id } } }
  );
};


module.exports.generateShareToken = async(user_id, project_id, permission = 'view', email = '') => {
  const project = await Project.findOne({ _id: project_id, user_id: user_id });
  if(!project) throw new Error("Projeto não encontrado");
  if(!project.isShareable) throw new Error("Projeto não compartilhável");

  if (!['view', 'edit'].includes(permission)) {
    throw new Error("Permissão inválida. Use 'view' ou 'edit'");
  }

  const token = jwt.sign({project_id: project_id, permission: permission}, "SECRET_KEY", {expiresIn: "24h"});
  
  // Guardar na BD para rastreamento e revogação
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);
  
  await Share.createShare(token, project_id, user_id, permission, email, expiresAt);
  
  return token;
};

module.exports.getSharedProject = async(user_id, token, userEmail) => {
  try{
    // Verificar se o share foi revogado
    const share = await Share.getShareByToken(token);
    if (!share) {
      throw new Error("Link inválido, expirado ou revogado");
    }

    // Validar se o email corresponde - se o share requer um email específico, validar
    if (share.email) {
      if (!userEmail) {
        throw new Error("Este convite requer um endereço de email válido.");
      }
      if (userEmail.toLowerCase() !== share.email.toLowerCase()) {
        throw new Error("Email inválido para o link de acesso");
      }
    }

    const decoded = jwt.verify(token, "SECRET_KEY");
    const projectId = decoded.project_id;
    const permission = decoded.permission || 'view';

    const project = await Project.findOneAndUpdate(
      {_id: projectId, user_id: { $ne: user_id } },
      {$addToSet: {collaborators: { userId: user_id, permission: permission }}},
      {new: true}
    );
    
    // Guardar o userId no share para notificações futuras
    if (project) {
      await Share.updateShareWithUserId(token, user_id);
    }
    
    return project;
  }catch(err){
    throw new Error(err.message || "Token inválido ou expirado");
  }
};


module.exports.getUserPermission = async(user_id, project_id) => {
  const project = await Project.findOne({ _id: project_id });
  if (!project) return null;
  

  if (project.user_id.toString() === user_id.toString()) {
    return 'edit';
  }
  

  const collaborator = project.collaborators.find(c => c.userId.toString() === user_id.toString());
  return collaborator ? collaborator.permission : null;
};

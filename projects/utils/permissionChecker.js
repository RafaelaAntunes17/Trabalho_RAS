const Project = require("../controllers/project");

// Middleware que verifica se o usuário tem permissão de edição
const checkEditPermission = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    const projectId = req.params.project || req.params.id;
    
    if (!userId || !projectId) {
      return res.status(400).json({ error: "Dados inválidos" });
    }

    const permission = await Project.getUserPermission(userId, projectId);
    
    // Se não tem permissão nenhuma, retorna 403
    if (!permission) {
      return res.status(403).json({ error: "Acesso negado ao projeto" });
    }
    
    // Se tem permissão view e quer fazer uma ação que exige edit, retorna 403
    if (permission === 'view') {
      return res.status(403).json({ error: "Você tem apenas permissão de leitura neste projeto" });
    }
    
    // Continua se tem permissão edit ou é dono
    req.userPermission = permission;
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Middleware que verifica se o usuário pode ver/acessar (view ou edit)
const checkViewPermission = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    const projectId = req.params.project || req.params.id;
    
    if (!userId || !projectId) {
      return res.status(400).json({ error: "Dados inválidos" });
    }

    const permission = await Project.getUserPermission(userId, projectId);
    
    if (!permission) {
      return res.status(403).json({ error: "Acesso negado ao projeto" });
    }
    
    req.userPermission = permission;
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Middleware que verifica se o usuário é o dono do projeto
const checkOwnerOnly = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    const projectId = req.params.project || req.params.id;
    
    if (!userId || !projectId) {
      return res.status(400).json({ error: "Dados inválidos" });
    }

    const Project_model = require("../models/project");
    const project = await Project_model.findOne({ _id: projectId });
    
    if (!project) {
      return res.status(404).json({ error: "Projeto não encontrado" });
    }
    
    // Verifica se é o dono
    if (project.user_id.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Apenas o dono pode executar esta ação" });
    }
    
    req.userPermission = 'edit';
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { checkEditPermission, checkViewPermission, checkOwnerOnly };

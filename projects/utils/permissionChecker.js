const Project = require("../controllers/project");

// Middleware to check if user has edit permission
const checkEditPermission = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    const projectId = req.params.project || req.params.id;
    
    if (!userId || !projectId) {
      return res.status(400).json({ error: "Dados inválidos" });
    }

    const permission = await Project.getUserPermission(userId, projectId);
    
    // If no permission, return 403
    if (!permission) {
      return res.status(403).json({ error: "Access denied to project" });
    }
    
    // If view permission but action requires edit, return 403
    if (permission === 'view') {
      return res.status(403).json({ error: "You only have read permission for this project" });
    }
    
    // Continue if has edit permission or is owner
    req.userPermission = permission;
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Middleware to check if user can view/access (view or edit)
const checkViewPermission = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    const projectId = req.params.project || req.params.id;
    
    if (!userId || !projectId) {
      return res.status(400).json({ error: "Invalid data" });
    }

    const permission = await Project.getUserPermission(userId, projectId);
    
    if (!permission) {
      return res.status(403).json({ error: "Access denied to project" });
    }
    
    req.userPermission = permission;
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Middleware to check if user is the project owner
const checkOwnerOnly = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    const projectId = req.params.project || req.params.id;
    
    if (!userId || !projectId) {
      return res.status(400).json({ error: "Invalid data" });
    }

    const Project_model = require("../models/project");
    const project = await Project_model.findOne({ _id: projectId });
    
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    // Check if is owner
    if (project.user_id.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Only the owner can perform this action" });
    }
    
    req.userPermission = 'edit';
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { checkEditPermission, checkViewPermission, checkOwnerOnly };

const mongoose = require("mongoose");

const toolSchema = new mongoose.Schema({
  position: { type: Number, required: true },
  procedure: { type: String, required: true },
  params: { type: mongoose.Schema.Types.Mixed, required: true }, // This field can be any type of object
});

const imgSchema = new mongoose.Schema({
  og_uri: { type: String, required: true },
  new_uri: { type: String, required: true },
  og_img_key: { type: String, required: true },
});

const collaboratorSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  permission: { type: String, enum: ['view', 'edit'], default: 'view' },
  _id: false
});

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, required: true }, // Maybe mudar para falso por causa de users anónimos, ou procurar alguma solução
  collaborators: { type: [collaboratorSchema], default: [] },
  isShareable: { type: Boolean, default: true },
  imgs: { type: [imgSchema], default: [] },
  tools: { type: [toolSchema], default: [] },
});

module.exports = mongoose.model("project", projectSchema);

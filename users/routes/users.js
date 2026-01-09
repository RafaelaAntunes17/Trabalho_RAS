var express = require("express");
var router = express.Router();

const User = require("../controllers/user");
const auth = require("../auth/auth");
const https = require("https"); // MUDAR DE http PARA https
// Defina o URL do serviço de projetos (ajuste a porta/host conforme o seu docker-compose)
const projects_ms = process.env.PROJECTS_URL || "https://projects:9001/"; // Alterado para HTTPS
const max_free_daily_op = process.env.FREE_DAILY_OP || 5;

function get_cur_date() {
  const date = new Date();
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();

  return { year: year, month: month, day: day };
}

function removeSensitiveInfo(user) {
  const userObj = user.toObject ? user.toObject() : user; // Ensure it's a plain object
  const { password_hash, ...userWithoutPassword } = userObj; // Destructure to exclude password_hash
  return userWithoutPassword;
}

function check_process(user, op, op_num) {
  if (op_num == 0) return true;

  return (
    user.type == "premium" ||
    (user.type == "free" && max_free_daily_op - op.processed >= op_num) ||
    (user.type == "anonymous" && op_num == 0)
  );
}

// Get list of all users
router.get("/", function (req, res, next) {
  User.getAll()
    .then((users) => res.status(200).jsonp(users))
    .catch((_) => res.status(700).jsonp(`Error acquiring all users`));
});

router.get("/validate/:user", function (req, res, next) {
  if (!req.headers.authorization) {
    return res.status(400).jsonp("Missing or invalid Authorization header.");
  }
  User.getOne(req.params.user)
    .then((user) => {
      const token = req.headers.authorization.split(" ")[1];
      try {
        const isValid = auth.validate_jwt(user, token);
        if (isValid) {
          const userResponse = removeSensitiveInfo(user);
          res.status(200).json({
            user: userResponse,
            token: token,
          });
        } else res.status(401).jsonp("Invalid token.");
      } catch (err) {
        console.error(err);
        res.status(500).jsonp("Error validating token.");
      }
    })
    .catch((_) => res.status(701).jsonp(`Error acquiring user's information.`));
});

// Get specific user
router.get("/:user", function (req, res, next) {
  User.getOne(req.params.user)
    .then((user) => {
      const userResponse = removeSensitiveInfo(user);
      res.status(200).jsonp(userResponse);
    })
    .catch((_) => res.status(701).jsonp(`Error acquiring user's information.`));
});

// Check user type
router.get("/:user/type/", function (req, res, next) {
  User.getOne(req.params.user)
    .then((user) => {
      res.status(200).send({ type: user.type });
    })
    .catch((_) => res.status(701).jsonp(`Error acquiring user's information.`));
});

// Test if we can process a project based on the number of advanced tools
router.get("/:user/process/:advanced_tools", function (req, res, next) {
  User.getOne(req.params.user)
    .then((user) => {
      const op_num = parseInt(req.params.advanced_tools);

      let op = {};

      const date = get_cur_date();
      const process_date = new Date(date.year, date.month, date.day);

      if (
        user.operations.filter(
          (o) => o.day.getTime() === process_date.getTime(),
        ).length > 0
      ) {
        op = user.operations.filter(
          (o) => o.day.getTime() === process_date.getTime(),
        )[0];
        user.operations.remove(op);
      } else {
        op = {
          day: process_date,
          processed: 0,
        };
      }

      let can_process = check_process(user, op, op_num);

      if (can_process) op.processed += op_num;

      user.operations.push(op);

      User.update(req.params.user, user)
        .then((_) => res.status(200).jsonp(can_process))
        .catch((_) =>
          res.status(704).jsonp(`Error updating user's information`),
        );
    })
    .catch((_) => res.status(701).jsonp(`Error acquiring user's information.`));
});

// Create a new user
router.post("/", function (req, res, next) {
  const user = {
    name: req.body.name || undefined,
    email: req.body.email || undefined,
    password: req.body.password || "",
    type: req.body.type || "free",
    operations: [],
  };

  console.log(user);
  console.log(req.body);

  User.create(user)
    .then((user) =>
      res
        .status(201)
        .jsonp({ user: removeSensitiveInfo(user), jwt: auth.get_jwt(user) }),
    )
    .catch((_) => {
      res.status(702).jsonp("Error creating a new user.");
    });
});

// Login user
router.post("/:email/login", function (req, res, next) {
  User.getOneEmail(req.params.email)
    .then(async (user) => {
      const correct_pass = await auth.authenticate(req.body.password, user);
      if (correct_pass) {
        const userResponse = removeSensitiveInfo(user);
        res.status(200).jsonp({
          user: userResponse, // eliminate key "password" from user object
          jwt: auth.get_jwt(user),
        });
      } else res.status(401).jsonp("The provided credentials are incorrect");
    })
    .catch((_) => res.status(701).jsonp(`Error acquiring user's information.`));
});

// Update user info
router.put("/:user", function (req, res, next) {
  User.getOne(req.params.user)
    .then((user) => {
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      user.type = req.body.type || user.type;

      if (req.body.password != null) {
        user.password = req.body.password || user.password;

        User.updatePassword(req.params.user, user)
          .then((_) => res.sendStatus(204))
          .catch((_) =>
            res.status(703).jsonp(`Error updating user's information`),
          );
      } else {
        User.update(req.params.user, user)
          .then((_) => res.sendStatus(204))
          .catch((_) =>
            res.status(704).jsonp(`Error updating user's information`),
          );
      }
    })
    .catch((_) => res.status(701).jsonp(`Error acquiring user's information.`));
});

// Update number of advanced tools used
router.put("/:user/process/:advanced_tools", function (req, res, next) {
  User.getOne(req.params.user)
    .then((user) => {
      const date = get_cur_date();
      const process_date = new Date(date.year, date.month, date.day);
      const op_num = parseInt(req.params.advanced_tools);

      let op = {};
      let rem_prev_op = false;

      if (
        user.operations.filter(
          (o) => o.day.getTime() === process_date.getTime(),
        ).length > 0
      ) {
        op = user.operations.filter(
          (o) => o.day.getTime() === process_date.getTime(),
        )[0];
        rem_prev_op = true;
      } else {
        op = {
          day: process_date,
          processed: 0,
        };
      }

      let can_process = check_process(user, op, op_num);

      if (!can_process) {
        res.status(799).jsonp("Cannot perform desired operation");
        return;
      }

      if (rem_prev_op) user.operations.remove(op);

      let new_op = {
        day: op.day,
        processed: op.processed + op_num,
      };

      user.operations.push(new_op);

      User.update(req.params.user, user)
        .then((_) => res.sendStatus(204))
        .catch((_) =>
          res.status(704).jsonp(`Error updating user's information`),
        );
    })
    .catch((_) => res.status(701).jsonp(`Error acquiring user's information.`));
});


// DEBUG MODE: Rota de eliminação
router.delete("/:user", function (req, res, next) {
  console.log("--- INÍCIO DO PEDIDO DE ELIMINAÇÃO ---");
  console.log("Utilizador alvo:", req.params.user);

  try {
    // 1. Verificar URL base
    const envUrl = process.env.PROJECTS_URL;
    const defaultUrl = "https://projects:9001/";
    const projects_ms_url = envUrl || defaultUrl;
    
    console.log("URL Base usado:", projects_ms_url);

    // 2. Construir URL completo
    const fullUrlString = `${projects_ms_url}${req.params.user}/all`;
    console.log("URL Completa String:", fullUrlString);

    const targetUrl = new URL(fullUrlString);
    console.log("URL Parseada com sucesso:", targetUrl.hostname, targetUrl.port, targetUrl.pathname);

    const options = {
      hostname: targetUrl.hostname,
      port: targetUrl.port,
      path: targetUrl.pathname,
      method: "DELETE",
      rejectUnauthorized: false, // Aceitar certificados auto-assinados
    };

    console.log("A iniciar pedido HTTPS...");

    // 3. Iniciar Pedido
    const request = https.request(options, (response) => {
      console.log("Recebida resposta do Projects Service. Status:", response.statusCode);
      
      if (response.statusCode === 200 || response.statusCode === 204) {
        console.log("Resposta positiva. A apagar utilizador local...");
        User.delete(req.params.user)
          .then((_) => {
            console.log("Utilizador apagado com sucesso.");
            res.sendStatus(204);
          })
          .catch((err) => {
            console.error("Erro no Mongo (User.delete):", err);
            res.status(705).jsonp(`Error deleting user's information`);
          });
      } else {
        console.error("Projects Service retornou erro:", response.statusCode);
        response.on('data', d => console.log("Corpo do erro:", d.toString()));
        res.status(500).jsonp("Erro ao limpar dados associados ao utilizador.");
      }
    });

    request.on("error", (error) => {
      console.error("ERRO DE REDE/HTTPS:", error.message);
      res.status(500).jsonp("Erro de comunicação interna: " + error.message);
    });

    request.end();
    console.log("Pedido enviado. À espera de resposta...");

  } catch (e) {
    console.error("ERRO SÍNCRONO (CRASH):", e);
    res.status(500).jsonp("Erro interno no servidor de utilizadores: " + e.message);
  }
});
module.exports = router;
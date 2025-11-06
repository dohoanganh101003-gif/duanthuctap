const express = require("express");
const router = express.Router();
const AdminUserController = require("../controllers/AdminUserController");

function isAdmin(req, res, next) {
  if (!req.session || req.session.role !== "admin") {
    return res.status(403).send("Bạn không có quyền truy cập trang này.");
  }
  next();
}

// Route chính
router.get("/", isAdmin, async (req, res) => {
  const pool = req.app.locals.pool;
  const controller = new AdminUserController(pool);
  controller.getAllUsers(req, res);
});

router.get("/:id", isAdmin, async (req, res) => {
  const pool = req.app.locals.pool;
  const controller = new AdminUserController(pool);
  controller.getUserById(req, res);
});

router.post("/:id/edit", isAdmin, async (req, res) => {
  const pool = req.app.locals.pool;
  const controller = new AdminUserController(pool);
  controller.updateUser(req, res);
});

router.post("/:id/role", isAdmin, async (req, res) => {
  const pool = req.app.locals.pool;
  const controller = new AdminUserController(pool);
  controller.changeRole(req, res);
});

router.post("/:id/status", isAdmin, async (req, res) => {
  const pool = req.app.locals.pool;
  const controller = new AdminUserController(pool);
  controller.changeStatus(req, res);
});

router.post("/:id/delete", isAdmin, async (req, res) => {
  const pool = req.app.locals.pool;
  const controller = new AdminUserController(pool);
  controller.deleteUser(req, res);
});

module.exports = router;

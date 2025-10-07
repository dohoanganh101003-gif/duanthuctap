const express = require("express");
const router = express.Router();
const AuthController = require("../controllers/AuthController");
const config = require("../config");

router.get("/dangky", (req, res) => {
  const pool = req.app.locals.pool;
  const authController = new AuthController(pool);
  authController.getRegisterPage(req, res, "user");
});

router.post("/dangky", (req, res) => {
  const pool = req.app.locals.pool;
  const authController = new AuthController(pool);
  authController.register(req, res, "user");
});

router.get("/dangky-owner", (req, res) => {
  const pool = req.app.locals.pool;
  const authController = new AuthController(pool);
  authController.getRegisterPage(req, res, "owner");
});

router.post("/dangky-owner", (req, res) => {
  const pool = req.app.locals.pool;
  const authController = new AuthController(pool);
  authController.register(req, res, "owner");
});

// ----- Admin đăng ký -----
router.get("/dangky-admin", (req, res) => {
  const pool = req.app.locals.pool;
  const authController = new AuthController(pool);
  authController.getRegisterPage(req, res, "admin");
});

router.post("/dangky-admin", (req, res) => {
  const pool = req.app.locals.pool;
  const authController = new AuthController(pool);
  authController.register(req, res, "admin");
});

router.get("/dangnhap", (req, res) => {
  const pool = req.app.locals.pool;
  console.log("pool in /dangnhap:", pool);
  if (!pool) console.error("Error: pool is undefined in /dangnhap");
  const authController = new AuthController(pool);
  authController.getLoginPage(req, res);
});

router.post("/dangnhap", (req, res) => {
  const pool = req.app.locals.pool;
  console.log("pool in POST /dangnhap:", pool);
  console.log("req.body in POST /dangnhap:", req.body);
  if (!pool) console.error("Error: pool is undefined in POST /dangnhap");
  const authController = new AuthController(pool);
  authController.login(req, res);
});

router.get("/dangxuat", (req, res) => {
  console.log("Session before logout:", req.session);
  req.session.destroy((err) => {
    if (err) {
      console.error("Lỗi khi đăng xuất:", err.stack);
      res.status(500).send("Lỗi khi đăng xuất");
    } else {
      console.log("Logout successful, redirecting to /dangnhap");
      res.redirect("/dangnhap");
    }
  });
});

module.exports = router;

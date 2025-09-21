const express = require("express");
const router = express.Router();
const AuthController = require("../controllers/AuthController");
const config = require("../config");

router.get("/dangky", (req, res) => {
  const pool = req.app.locals.pool;
  console.log("pool in /dangky:", pool);
  if (!pool) console.error("Error: pool is undefined in /dangky");
  const authController = new AuthController(pool);
  authController.getRegisterPage(req, res);
});

router.post("/dangky", (req, res) => {
  const pool = req.app.locals.pool;
  console.log("pool in POST /dangky:", pool);
  console.log("req.body in POST /dangky:", req.body);
  if (!pool) console.error("Error: pool is undefined in POST /dangky");
  const authController = new AuthController(pool);
  authController.register(req, res);
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

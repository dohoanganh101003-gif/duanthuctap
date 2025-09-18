const express = require("express");
const router = express.Router();
const AuthController = require("../controllers/AuthController");

const authController = new AuthController(express().locals.pool);

router.get("/dangky", authController.getRegisterPage.bind(authController));
router.post("/dangky", authController.register.bind(authController));
router.get("/dangnhap", authController.getLoginPage.bind(authController));
router.post("/dangnhap", authController.login.bind(authController));
router.get("/dangxuat", authController.logout.bind(authController));

module.exports = router;

const express = require("express");
const ThongKeController = require("../controllers/ThongKeController");

module.exports = (pool) => {
  const router = express.Router();
  const thongKeController = new ThongKeController(pool);

  function requireLogin(req, res, next) {
    if (!req.session || !req.session.user_id) {
      return res.redirect("/dangnhap");
    }
    next();
  }

  router.get("/", requireLogin, (req, res) =>
    thongKeController.renderThongKe(req, res)
  );
  router.get("/:type", requireLogin, (req, res) =>
    thongKeController.getThongKe(req, res)
  );

  return router;
};

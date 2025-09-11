const pool = require("../config/db");
const bcrypt = require("bcryptjs");

module.exports = {
  async createUser({ username, password, email, phone, role }) {
    if (!["admin", "user"].includes(role)) {
      throw new Error("Vai trò không hợp lệ");
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (username, password, email, phone, role) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [username, hashedPassword, email, phone, role]
    );
    return result.rows[0];
  },

  async findUserByUsername(username) {
    const result = await pool.query("SELECT * FROM users WHERE username = $1", [
      username,
    ]);
    return result.rows[0];
  },
};

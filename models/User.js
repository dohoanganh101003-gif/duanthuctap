const bcrypt = require("bcryptjs");

class User {
  constructor(pool) {
    this.pool = pool;
  }

  async getUserByUsername(username) {
    try {
      const { rows } = await this.pool.query(
        `
        SELECT id, username, email, password_hash, phone, role
        FROM users
        WHERE username = $1
      `,
        [username]
      );
      return rows[0] || null;
    } catch (err) {
      throw new Error(`Lỗi khi lấy người dùng theo username: ${err.message}`);
    }
  }

  async createUser({ username, email, password, phone, role }) {
    try {
      const password_hash = await bcrypt.hash(password, 10);
      const { rows } = await this.pool.query(
        `
        INSERT INTO users (username, email, password_hash, phone, role)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, username, email, phone, role
      `,
        [username, email, password_hash, phone, role]
      );
      return rows[0];
    } catch (err) {
      throw new Error(`Lỗi khi tạo người dùng: ${err.message}`);
    }
  }
}

module.exports = User;

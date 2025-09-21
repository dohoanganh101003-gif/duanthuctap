const bcrypt = require("bcryptjs");

class User {
  constructor(pool) {
    this.pool = pool;
  }

  async getUserByUsername(username) {
    const result = await this.pool.query(
      "SELECT * FROM public.users WHERE username = $1",
      [username]
    );
    return result.rows[0];
  }

  async getUserById(id) {
    const result = await this.pool.query(
      "SELECT id FROM public.users WHERE id = $1",
      [id]
    );
    return result.rows[0];
  }

  async createUser({ username, email, password, phone, role }) {
    const hashedPassword = await bcrypt.hash(password, 10);
    await this.pool.query(
      "INSERT INTO public.users (username, email, password_hash, phone, role) VALUES ($1, $2, $3, $4, $5)",
      [username, email, hashedPassword, phone, role]
    );
  }
}

module.exports = User;

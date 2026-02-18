const { query } = require("../config/db");

async function createUser({ fullName, email, passwordHash, role = "client", phone = null }) {
  const sql = `
    INSERT INTO users (full_name, email, password_hash, role, phone)
    VALUES (?, ?, ?, ?, ?)
  `;
  const result = await query(sql, [fullName, email, passwordHash, role, phone]);
  return result.insertId;
}

async function findUserByEmail(email) {
  const sql = `
    SELECT id, full_name, email, phone, password_hash, role, is_active, created_at
    FROM users
    WHERE email = ?
    LIMIT 1
  `;
  const rows = await query(sql, [email]);
  return rows[0] || null;
}

async function findUserById(id) {
  const sql = `
    SELECT id, full_name, email, phone, role, is_active, created_at, updated_at
    FROM users
    WHERE id = ?
    LIMIT 1
  `;
  const rows = await query(sql, [id]);
  return rows[0] || null;
}

async function getUserSafeProfileById(id) {
  const sql = `
    SELECT id, full_name, email, phone, role, is_active, created_at, updated_at
    FROM users
    WHERE id = ?
    LIMIT 1
  `;
  const rows = await query(sql, [id]);
  return rows[0] || null;
}

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  getUserSafeProfileById,
};

const { query } = require("../config/db");

async function createUser({ email, passwordHash, role = "user" }) {
  const normalizedRole = ["user", "guide", "admin"].includes(role) ? role : "user";
  const fallbackFullName = email.split("@")[0].slice(0, 120) || "User";
  const sql = `
    INSERT INTO users (full_name, email, password_hash, role, is_active)
    VALUES (?, ?, ?, ?, 1)
  `;
  const result = await query(sql, [fallbackFullName, email, passwordHash, normalizedRole]);
  return result.insertId;
}

async function findUserByEmail(email) {
  const sql = `
    SELECT id, email, password_hash, role, is_active, created_at, updated_at
    FROM users
    WHERE email = ?
    LIMIT 1
  `;
  const rows = await query(sql, [email]);
  return rows[0] || null;
}

async function findUserById(id) {
  const sql = `
    SELECT id, email, role, is_active, created_at, updated_at
    FROM users
    WHERE id = ?
    LIMIT 1
  `;
  const rows = await query(sql, [id]);
  return rows[0] || null;
}

async function getUserSafeProfileById(id) {
  const sql = `
    SELECT id, email, role, is_active, created_at, updated_at
    FROM users
    WHERE id = ?
    LIMIT 1
  `;
  const rows = await query(sql, [id]);
  return rows[0] || null;
}

async function getAuthUserById(id) {
  const sql = `
    SELECT id, email, role, is_active
    FROM users
    WHERE id = ?
    LIMIT 1
  `;
  const rows = await query(sql, [id]);
  return rows[0] || null;
}

async function getAllUsersForAdmin() {
  const sql = `
    SELECT id, email, role, is_active, created_at, updated_at
    FROM users
    ORDER BY created_at DESC
  `;
  return query(sql);
}

async function updateUserRoleById(id, role) {
  const sql = `
    UPDATE users
    SET role = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    LIMIT 1
  `;
  const result = await query(sql, [role, id]);
  return result.affectedRows > 0;
}

async function updateUserStatusById(id, isActive) {
  const sql = `
    UPDATE users
    SET is_active = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    LIMIT 1
  `;
  const result = await query(sql, [isActive ? 1 : 0, id]);
  return result.affectedRows > 0;
}

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  getUserSafeProfileById,
  getAuthUserById,
  getAllUsersForAdmin,
  updateUserRoleById,
  updateUserStatusById,
};

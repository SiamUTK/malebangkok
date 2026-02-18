const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_POOL_SIZE) || 20,
  queueLimit: 0,
  decimalNumbers: true,
  timezone: "Z",
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  namedPlaceholders: false,
  supportBigNumbers: true,
  bigNumberStrings: false,
  multipleStatements: false,
});

async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function checkDatabaseConnection() {
  const connection = await pool.getConnection();
  try {
    await connection.query("SELECT 1");
  } finally {
    connection.release();
  }
}

async function withTransaction(callback) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  pool,
  query,
  checkDatabaseConnection,
  withTransaction,
};

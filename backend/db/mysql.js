const mysql = require("mysql2/promise");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const isRemote =
  process.env.DB_SSL === "true" ||
  process.env.DB_SSL === "1" ||
  (process.env.DB_HOST &&
    !process.env.DB_HOST.includes("localhost") &&
    !process.env.DB_HOST.includes("127.0.0.1")) ||
  (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("localhost"));

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "test",
  port: Number(process.env.DB_PORT || 4000),
  ssl: isRemote ? { minVersion: "TLSv1.2", rejectUnauthorized: true } : undefined,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;

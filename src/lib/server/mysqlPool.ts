import mysql from "mysql2/promise";

let pool: mysql.Pool | null = null;

export function getMysqlPool() {
  if (pool) return pool;

  const host = process.env.SAYBAN_MYSQL_HOST || process.env.MYSQL_HOST;
  const user = process.env.SAYBAN_MYSQL_USER || process.env.MYSQL_USER;
  const password =
    process.env.SAYBAN_MYSQL_PASSWORD || process.env.MYSQL_PASSWORD;
  const database =
    process.env.SAYBAN_MYSQL_DATABASE || process.env.MYSQL_DATABASE;
  const port = Number(
    process.env.SAYBAN_MYSQL_PORT || process.env.MYSQL_PORT || 3306
  );

  if (!host || !user || !password || !database) {
    throw new Error(
      "Support DB is not configured. Set SAYBAN_MYSQL_HOST, SAYBAN_MYSQL_USER, SAYBAN_MYSQL_PASSWORD, and SAYBAN_MYSQL_DATABASE."
    );
  }

  pool = mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 5,
    timezone: "+00:00"
  });

  return pool;
}

export function isMysqlConfigured() {
  const host = process.env.SAYBAN_MYSQL_HOST || process.env.MYSQL_HOST;
  const user = process.env.SAYBAN_MYSQL_USER || process.env.MYSQL_USER;
  const password =
    process.env.SAYBAN_MYSQL_PASSWORD || process.env.MYSQL_PASSWORD;
  const database =
    process.env.SAYBAN_MYSQL_DATABASE || process.env.MYSQL_DATABASE;
  return Boolean(host && user && password && database);
}

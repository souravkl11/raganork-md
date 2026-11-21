const { Sequelize } = require("sequelize");
const store = require("../config/store");

// must not require config.js or any model at load: config.js requires this file

function applySQLiteResilience(sequelizeInstance) {
  if (!sequelizeInstance || sequelizeInstance.__sqliteGuardsApplied) {
    return;
  }

  sequelizeInstance.__sqliteGuardsApplied = true;
  const busyTimeoutMs = parseInt(process.env.SQLITE_BUSY_TIMEOUT || "15000", 10);
  const pragmas = [
    "PRAGMA journal_mode=WAL;",
    "PRAGMA synchronous=NORMAL;",
    "PRAGMA temp_store=MEMORY;",
    "PRAGMA cache_size=-32000;",
    `PRAGMA busy_timeout=${busyTimeoutMs};`,
  ];

  sequelizeInstance.addHook("afterConnect", async (connection) => {
    if (!connection || typeof connection.exec !== "function") {
      return;
    }

    try {
      for (const pragma of pragmas) {
        await new Promise((resolve, reject) => {
          connection.exec(pragma, (err) => (err ? reject(err) : resolve()));
        });
      }
    } catch (error) {
      require("../../config").logger.warn({ err: error }, "failed to apply sqlite pragmas");
    }
  });

  const originalQuery = sequelizeInstance.query.bind(sequelizeInstance);
  const writeQueue = [];
  let queueActive = false;

  const flushQueue = async () => {
    if (queueActive || writeQueue.length === 0) {
      return;
    }

    queueActive = true;

    while (writeQueue.length > 0) {
      const { task, resolve, reject } = writeQueue.shift();
      try {
        const result = await task();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }

    queueActive = false;
  };

  const isWriteQuery = (sql) => {
    if (!sql || typeof sql !== "string") return true;
    const normalizedSql = sql.trim().toUpperCase();
    return (
      normalizedSql.startsWith("INSERT") ||
      normalizedSql.startsWith("UPDATE") ||
      normalizedSql.startsWith("DELETE") ||
      normalizedSql.startsWith("CREATE") ||
      normalizedSql.startsWith("ALTER") ||
      normalizedSql.startsWith("DROP") ||
      normalizedSql.startsWith("PRAGMA")
    );
  };

  sequelizeInstance.query = function serializedQuery(sql, ...rest) {
    // only writes are queued. transaction-bound queries skip it: the transaction already holds
    // the lock, and queueing behind a writer waiting on it stalls until busy_timeout
    if (!isWriteQuery(sql) || rest[0]?.transaction) {
      return originalQuery(sql, ...rest);
    }

    return new Promise((resolve, reject) => {
      writeQueue.push({
        task: () => originalQuery(sql, ...rest),
        resolve,
        reject,
      });
      setImmediate(flushQueue);
    });
  };

  if (typeof sequelizeInstance.queryRaw === "function") {
    const originalQueryRaw = sequelizeInstance.queryRaw.bind(sequelizeInstance);
    sequelizeInstance.queryRaw = function serializedQueryRaw(sql, ...rest) {
      if (!isWriteQuery(sql) || rest[0]?.transaction) {
        return originalQueryRaw(sql, ...rest);
      }

      return new Promise((resolve, reject) => {
        writeQueue.push({
          task: () => originalQueryRaw(sql, ...rest),
          resolve,
          reject,
        });
        setImmediate(flushQueue);
      });
    };
  }
}

const SQLITE_PATH = process.env.SQLITE_PATH || "./bot.db";
const DATABASE_URL =
  process.env.DATABASE_URL === undefined
    ? SQLITE_PATH
    : process.env.DATABASE_URL;
const DEBUG = store.fromEnv("DEBUG");

const sequelize = (() => {
  if (DATABASE_URL === SQLITE_PATH) {
    const sqliteInstance = new Sequelize({
      dialect: "sqlite",
      storage: DATABASE_URL,
      logging: false,
      retry: {
        match: [/SQLITE_BUSY/, /database is locked/, /EBUSY/],
        max: 3,
      },
      pool: {
        max: 5,
        min: 1,
        acquire: 30000,
        idle: 10000,
      },
    });

    applySQLiteResilience(sqliteInstance);
    return sqliteInstance;
  }

  const useSsl = !["false", "0", "off", "no"].includes(
    String(process.env.DATABASE_SSL ?? "true").trim().toLowerCase(),
  );
  return new Sequelize(DATABASE_URL, {
    dialectOptions: useSsl ? { ssl: { require: true, rejectUnauthorized: false } } : {},
    // only DEBUG=true: a string like "frame" is not a valid sequelize logger
    logging: DEBUG === true,
    pool: {
      max: 20,
      min: 5,
      acquire: 30000,
      idle: 10000,
    },
  });
})();

module.exports = { sequelize, DATABASE_URL, SQLITE_PATH, applySQLiteResilience };

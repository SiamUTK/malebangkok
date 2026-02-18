const path = require("path");
const { createLogger, format, transports } = require("winston");

const logLevel = process.env.LOG_LEVEL || "info";
const logFilePath = path.join(__dirname, "..", "logs", "app.log");
const errorLogFilePath = path.join(__dirname, "..", "logs", "error.log");
const isProduction = (process.env.NODE_ENV || "development") === "production";

const logger = createLogger({
  level: logLevel,
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  defaultMeta: { service: "malebangkok-api" },
  transports: [
    new transports.Console({
      format: isProduction
        ? format.combine(format.timestamp(), format.json())
        : format.combine(
            format.colorize(),
            format.printf(({ level, message, timestamp, ...meta }) => {
              const payload = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
              return `${timestamp} ${level}: ${message}${payload}`;
            })
          ),
    }),
    new transports.File({ filename: logFilePath }),
    new transports.File({ filename: errorLogFilePath, level: "error" }),
  ],
});

module.exports = logger;
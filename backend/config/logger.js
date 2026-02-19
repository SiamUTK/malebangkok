const fs = require("fs");
const path = require("path");
const { createLogger, format, transports } = require("winston");

const logLevel = process.env.LOG_LEVEL || "info";
const logsDir = path.join(__dirname, "..", "logs");
const logFilePath = path.join(logsDir, "application.log");
const accessLogFilePath = path.join(logsDir, "access.log");
const errorLogFilePath = path.join(logsDir, "error.log");
const isProduction = (process.env.NODE_ENV || "development") === "production";
const serviceName = process.env.SERVICE_NAME || "malebangkok-api";
const maxFileSizeBytes = Number(process.env.LOG_MAX_SIZE_BYTES) || 10 * 1024 * 1024;
const maxFiles = Number(process.env.LOG_MAX_FILES) || 10;

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const onlyAccessLogs = format((info) => (info.event === "access" ? info : false));

const correlationIdFormat = format((info) => {
  if (!info.correlationId && info.requestId) {
    info.correlationId = info.requestId;
  }

  if (!info.timestamp) {
    info.timestamp = new Date().toISOString();
  }

  return info;
});

const baseJsonFormat = format.combine(
  correlationIdFormat(),
  format.timestamp(),
  format.errors({ stack: true }),
  format.json()
);

const devConsoleFormat = format.combine(
  correlationIdFormat(),
  format.colorize(),
  format.timestamp(),
  format.errors({ stack: true }),
  format.printf(({ level, message, timestamp, correlationId, ...meta }) => {
    const cid = correlationId ? ` [cid:${correlationId}]` : "";
    const payload = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `${timestamp} ${level}${cid}: ${message}${payload}`;
  })
);

const logger = createLogger({
  level: logLevel,
  format: baseJsonFormat,
  defaultMeta: { service: serviceName },
  transports: [
    new transports.Console({
      format: isProduction ? baseJsonFormat : devConsoleFormat,
    }),
    new transports.File({
      filename: logFilePath,
      maxsize: maxFileSizeBytes,
      maxFiles,
      tailable: true,
      format: baseJsonFormat,
    }),
    new transports.File({
      filename: accessLogFilePath,
      maxsize: maxFileSizeBytes,
      maxFiles,
      tailable: true,
      format: format.combine(onlyAccessLogs(), baseJsonFormat),
    }),
    new transports.File({
      filename: errorLogFilePath,
      level: "error",
      maxsize: maxFileSizeBytes,
      maxFiles,
      tailable: true,
      format: baseJsonFormat,
    }),
  ],
  exitOnError: false,
  exceptionHandlers: [
    new transports.File({
      filename: path.join(logsDir, "exceptions.log"),
      maxsize: maxFileSizeBytes,
      maxFiles,
      tailable: true,
      format: baseJsonFormat,
    }),
  ],
  rejectionHandlers: [
    new transports.File({
      filename: path.join(logsDir, "rejections.log"),
      maxsize: maxFileSizeBytes,
      maxFiles,
      tailable: true,
      format: baseJsonFormat,
    }),
  ],
});

module.exports = logger;
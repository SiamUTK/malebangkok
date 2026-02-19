const { v4: uuidv4 } = require("uuid");
const logger = require("../config/logger");

function requestLogger(req, res, next) {
  req.requestId = uuidv4();
  res.setHeader("X-Request-Id", req.requestId);

  const startedAt = process.hrtime.bigint();

  res.on("finish", () => {
    const elapsedNanoseconds = process.hrtime.bigint() - startedAt;
    const responseTimeMs = Number(elapsedNanoseconds / 1000000n);

    logger.info("http_access", {
      event: "access",
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      responseTime: responseTimeMs,
      ip: req.ip,
      userId: req.user?.id || null,
    });
  });

  next();
}

module.exports = {
  requestLogger,
};

function roleMiddleware(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!roles || roles.length === 0) {
      return next();
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden: insufficient privileges" });
    }

    return next();
  };
}

module.exports = {
  roleMiddleware,
};
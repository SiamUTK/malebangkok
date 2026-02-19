const bcrypt = require("bcrypt");
const { createUser, findUserByEmail, getUserSafeProfileById } = require("../models/userModel");
const { signAccessToken } = require("../utils/tokenUtils");
const { AppError } = require("../middleware/errorMiddleware");

async function register(req, res, next) {
  try {
    const { email, password, role } = req.body;

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await findUserByEmail(normalizedEmail);

    if (existingUser) {
      return res.status(409).json({ message: "Email already in use" });
    }

    const allowedRegistrationRoles = ["user", "guide"];
    const userRole = allowedRegistrationRoles.includes(role) ? role : "user";

    const passwordHash = await bcrypt.hash(password, 12);
    const userId = await createUser({
      email: normalizedEmail,
      passwordHash,
      role: userRole,
    });

    const createdUser = await getUserSafeProfileById(userId);
    const token = signAccessToken(createdUser);

    return res.status(201).json({
      message: "Registration successful",
      token,
      user: createdUser,
    });
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const normalizedEmail = email.toLowerCase().trim();
    const user = await findUserByEmail(normalizedEmail);

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.is_active) {
      throw new AppError("Account is disabled", 403);
    }

    const token = signAccessToken(user);

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        is_active: user.is_active,
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function me(req, res, next) {
  try {
    const user = await getUserSafeProfileById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ user });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  register,
  login,
  me,
};

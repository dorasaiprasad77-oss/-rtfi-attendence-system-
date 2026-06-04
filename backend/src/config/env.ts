import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "4000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  jwtSecret: process.env.JWT_SECRET || "default-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  defaultAdminEmail: process.env.DEFAULT_ADMIN_EMAIL || "admin@school.edu",
  defaultAdminPassword: process.env.DEFAULT_ADMIN_PASSWORD || "admin123",
};

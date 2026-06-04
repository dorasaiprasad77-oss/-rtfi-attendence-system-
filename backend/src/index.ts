import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import http from "http";
import { config } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { initSocketServer } from "./config/socket";
import { startDeviceHealthMonitor } from "./services/deviceHealthMonitor";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import attendanceRoutes from "./routes/attendanceRoutes";
import deviceRoutes from "./routes/deviceRoutes";
import reportRoutes from "./routes/reportRoutes";
import setupRoutes from "./routes/setupRoutes";

const app = express();
const httpServer = http.createServer(app);

// Initialize WebSocket server
initSocketServer(httpServer);

// Security
app.use(helmet());
app.use(cors({ origin: config.frontendUrl, credentials: true }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan(config.nodeEnv === "production" ? "combined" : "dev"));

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/devices", deviceRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/setup", setupRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

httpServer.listen(config.port, () => {
  console.log(`🚀 Server running on port ${config.port} in ${config.nodeEnv} mode`);
  console.log(`🔌 WebSocket server ready`);
  startDeviceHealthMonitor();
});

export default app;

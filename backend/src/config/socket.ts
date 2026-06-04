import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { config } from "../config/env";

let io: Server;

export function initSocketServer(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: config.frontendUrl,
      credentials: true,
    },
  });

  // Auth middleware for socket connections
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    if (!token || typeof token !== "string") {
      return next(new Error("Authentication required"));
    }
    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      (socket as any).user = decoded;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const user = (socket as any).user;
    console.log(`🔌 WebSocket connected: ${user?.name || "unknown"} (${socket.id})`);

    // Join role-based rooms
    socket.join("dashboard");
    if (user?.role === "ADMIN") socket.join("admins");
    if (user?.role === "FACULTY") socket.join("faculty");
    socket.join("all-devices");

    socket.on("disconnect", (reason) => {
      console.log(`🔌 WebSocket disconnected: ${socket.id} (${reason})`);
    });
  });

  console.log("🔌 WebSocket server initialized");
  return io;
}

export function getIO(): Server {
  if (!io) throw new Error("Socket.IO not initialized");
  return io;
}

// --- Event emitters ---

export interface AttendanceEvent {
  type: "attendance:new" | "attendance:denied";
  timestamp: string;
  data: {
    id: string;
    user: {
      id: string;
      name: string;
      rollNo: string | null;
      department: string | null;
      photoUrl: string | null;
    };
    device: {
      id: string;
      deviceName: string;
      location: string;
    } | null;
    status: string;
    alreadyMarked?: boolean;
    access: "GRANTED" | "DENIED";
    message?: string;
  };
}

export interface DeviceEvent {
  type: "device:status" | "device:online" | "device:offline";
  timestamp: string;
  data: {
    id: string;
    deviceName: string;
    location: string;
    status: string;
    lastSeen: string | null;
  };
}

export interface StatsUpdateEvent {
  type: "stats:update";
  timestamp: string;
  data: {
    presentToday: number;
    absentToday: number;
    activeDevices: number;
  };
}

export function emitAttendanceEvent(event: AttendanceEvent) {
  if (!io) return;
  io.to("dashboard").to("all-devices").emit(event.type, event);
}

export function emitDeviceEvent(event: DeviceEvent) {
  if (!io) return;
  io.to("dashboard").to("all-devices").emit(event.type, event);
}

export function emitStatsUpdate(event: StatsUpdateEvent) {
  if (!io) return;
  io.to("dashboard").emit(event.type, event);
}

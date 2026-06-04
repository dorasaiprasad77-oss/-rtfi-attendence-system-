"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { getToken } from "./api";

const WS_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export interface AttendanceEventData {
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

export interface DeviceEventData {
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

export interface StatsUpdateData {
  type: "stats:update";
  timestamp: string;
  data: {
    presentToday: number;
    absentToday: number;
    activeDevices: number;
  };
}

type EventMap = {
  "attendance:new": AttendanceEventData;
  "attendance:denied": AttendanceEventData;
  "device:status": DeviceEventData;
  "device:online": DeviceEventData;
  "device:offline": DeviceEventData;
  "stats:update": StatsUpdateData;
};

// Singleton socket instance shared across all hook consumers
let sharedSocket: Socket | null = null;
let sharedConnected = false;
let connectCallbacks: Set<(connected: boolean) => void> = new Set();
let eventListeners: Map<string, Set<(data: any) => void>> = new Map();

function ensureSocket(): Socket {
  if (sharedSocket) return sharedSocket;

  const token = getToken();
  if (!token) throw new Error("No auth token");

  const socket = io(WS_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
  });

  sharedSocket = socket;

  socket.on("connect", () => {
    sharedConnected = true;
    connectCallbacks.forEach((cb) => cb(true));
  });

  socket.on("disconnect", () => {
    sharedConnected = false;
    connectCallbacks.forEach((cb) => cb(false));
  });

  socket.on("connect_error", () => {
    sharedConnected = false;
    connectCallbacks.forEach((cb) => cb(false));
  });

  // Forward all events to registered listeners
  const eventTypes: (keyof EventMap)[] = [
    "attendance:new",
    "attendance:denied",
    "device:status",
    "device:online",
    "device:offline",
    "stats:update",
  ];

  eventTypes.forEach((eventType) => {
    socket.on(eventType, (data: any) => {
      const listeners = eventListeners.get(eventType);
      if (listeners) {
        listeners.forEach((cb) => cb(data));
      }
    });
  });

  return socket;
}

export function disconnectSocket() {
  if (sharedSocket) {
    sharedSocket.disconnect();
    sharedSocket = null;
    sharedConnected = false;
    connectCallbacks.forEach((cb) => cb(false));
  }
}

export function useSocket() {
  const [connected, setConnected] = useState(sharedConnected);
  const [lastEvent, setLastEvent] = useState<AttendanceEventData | null>(null);

  useEffect(() => {
    let socket: Socket;
    try {
      socket = ensureSocket();
    } catch {
      return;
    }

    // Register connection status callback
    connectCallbacks.add(setConnected);
    setConnected(sharedConnected);

    // Register attendance event listener to track lastEvent
    const onAttendance = (data: AttendanceEventData) => setLastEvent(data);
    const handlers: Array<[(data: any) => void, string]> = [
      [onAttendance, "attendance:new"],
      [onAttendance, "attendance:denied"],
    ];

    handlers.forEach(([cb, event]) => {
      if (!eventListeners.has(event)) eventListeners.set(event, new Set());
      eventListeners.get(event)!.add(cb);
    });

    return () => {
      connectCallbacks.delete(setConnected);
      handlers.forEach(([cb, event]) => {
        eventListeners.get(event)?.delete(cb);
      });
    };
  }, []);

  const on = useCallback(<K extends keyof EventMap>(event: K, callback: (data: EventMap[K]) => void) => {
    if (!eventListeners.has(event)) {
      eventListeners.set(event, new Set());
    }
    eventListeners.get(event)!.add(callback);

    return () => {
      eventListeners.get(event)?.delete(callback);
    };
  }, []);

  return { connected, lastEvent, on, socket: sharedSocket };
}

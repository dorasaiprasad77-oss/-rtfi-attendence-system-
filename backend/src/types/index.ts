import { Request } from "express";

export interface AuthUser {
  id: string;
  email: string;
  role: "ADMIN" | "FACULTY" | "STUDENT";
  name: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export interface RfidScanPayload {
  uid: string;
  deviceId: string;
}

export interface AttendanceQuery {
  startDate?: string;
  endDate?: string;
  userId?: string;
  status?: string;
  department?: string;
}

export interface ReportQuery {
  type: "daily" | "weekly" | "monthly" | "custom";
  startDate?: string;
  endDate?: string;
  department?: string;
  userId?: string;
}

export interface DashboardStats {
  totalUsers: number;
  presentToday: number;
  absentToday: number;
  activeDevices: number;
  recentActivity: any[];
  attendanceByDepartment: any[];
  weeklyTrend: any[];
}

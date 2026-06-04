import { Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../config/database";
import { AuthRequest } from "../types";

export async function getUsers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { role, department, search, page = "1", limit = "20" } = req.query as Record<string, string>;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (role) where.role = role;
    if (department) where.department = department;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { rollNo: { contains: search, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          rollNo: true,
          department: true,
          role: true,
          rfidUid: true,
          isActive: true,
          photoUrl: true,
          createdAt: true,
          _count: { select: { attendance: true } },
        },
        skip,
        take: limitNum,
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getUserById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        rollNo: true,
        department: true,
        role: true,
        rfidUid: true,
        isActive: true,
        photoUrl: true,
        createdAt: true,
        attendance: {
          orderBy: { date: "desc" },
          take: 30,
          include: { device: { select: { deviceName: true, location: true } } },
        },
        assignedCards: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function createUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name, email, password, rollNo, department, role, rfidUid } = req.body;

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, ...(rollNo ? [{ rollNo }] : [])] },
    });
    if (existingUser) {
      res.status(409).json({ error: "User with this email or roll number already exists" });
      return;
    }

    if (rfidUid) {
      const existingCard = await prisma.rfidCard.findUnique({ where: { uid: rfidUid } });
      if (existingCard) {
        res.status(409).json({ error: "RFID card is already assigned to another user" });
        return;
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        rollNo,
        department,
        role: role || "STUDENT",
        rfidUid,
      },
      select: {
        id: true,
        name: true,
        email: true,
        rollNo: true,
        department: true,
        role: true,
        rfidUid: true,
        createdAt: true,
      },
    });

    if (rfidUid) {
      await prisma.rfidCard.create({
        data: { uid: rfidUid, userId: user.id },
      });
    }

    res.status(201).json(user);
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { name, email, rollNo, department, role, rfidUid, isActive } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (rfidUid && rfidUid !== existingUser.rfidUid) {
      const existingCard = await prisma.rfidCard.findFirst({
        where: { uid: rfidUid, userId: { not: id } },
      });
      if (existingCard) {
        res.status(409).json({ error: "RFID card is already assigned to another user" });
        return;
      }

      if (existingUser.rfidUid) {
        await prisma.rfidCard.updateMany({
          where: { uid: existingUser.rfidUid },
          data: { isActive: false },
        });
      }

      await prisma.rfidCard.upsert({
        where: { uid: rfidUid },
        create: { uid: rfidUid, userId: id },
        update: { userId: id, isActive: true },
      });
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(rollNo && { rollNo }),
        ...(department && { department }),
        ...(role && { role }),
        ...(rfidUid !== undefined && { rfidUid }),
        ...(isActive !== undefined && { isActive }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        rollNo: true,
        department: true,
        role: true,
        rfidUid: true,
        isActive: true,
      },
    });

    res.json(user);
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function resetPassword(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || typeof password !== "string" || password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    res.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function deleteUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    await prisma.user.delete({ where: { id } });

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

import { Response } from "express";
import bcrypt from "bcryptjs";
import * as XLSX from "xlsx";
import prisma from "../config/database";
import { AuthRequest } from "../types";

interface ImportRow {
  name: string;
  email: string;
  password?: string;
  rollNo?: string;
  department?: string;
  role?: string;
  rfidUid?: string;
}

interface ImportError {
  row: number;
  message: string;
}

export async function bulkImportUsers(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    // Parse the uploaded file
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json<ImportRow>(worksheet, { defval: "" });

    if (data.length === 0) {
      res.status(400).json({ error: "File is empty or has no data rows" });
      return;
    }

    // Validate required columns exist
    const firstRow = data[0];
    const requiredColumns = ["name", "email"];
    const missingColumns = requiredColumns.filter(col => !(col in firstRow));
    
    if (missingColumns.length > 0) {
      res.status(400).json({ 
        error: `Missing required columns: ${missingColumns.join(", ")}`,
        hint: "Required columns: name, email. Optional: password, rollNo, department, role, rfidUid"
      });
      return;
    }

    const errors: ImportError[] = [];
    let successCount = 0;
    let skippedCount = 0;

    // Process each row
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2; // +2 because row 1 is header, and arrays are 0-indexed

      try {
        // Validate required fields
        if (!row.name || !String(row.name).trim()) {
          errors.push({ row: rowNum, message: "Name is required" });
          continue;
        }

        if (!row.email || !String(row.email).trim()) {
          errors.push({ row: rowNum, message: "Email is required" });
          continue;
        }

        const name = String(row.name).trim();
        const email = String(row.email).trim().toLowerCase();
        const rollNo = row.rollNo ? String(row.rollNo).trim() : null;
        const department = row.department ? String(row.department).trim() : null;
        const role = row.role ? String(row.role).trim().toUpperCase() : "STUDENT";
        const rfidUid = row.rfidUid ? String(row.rfidUid).trim() : null;
        
        // Generate default password if not provided
        const password = row.password ? String(row.password) : "password123";

        // Check for duplicate email
        const existingUser = await prisma.user.findFirst({
          where: {
            OR: [
              { email },
              ...(rollNo ? [{ rollNo }] : [])
            ]
          }
        });

        if (existingUser) {
          skippedCount++;
          continue; // Skip duplicates silently
        }

        // Check for duplicate RFID card
        if (rfidUid) {
          const existingCard = await prisma.rfidCard.findUnique({
            where: { uid: rfidUid }
          });

          if (existingCard) {
            errors.push({ row: rowNum, message: `RFID card ${rfidUid} is already assigned` });
            continue;
          }
        }

        // Validate role
        const validRoles = ["STUDENT", "FACULTY", "ADMIN"];
        if (!validRoles.includes(role)) {
          errors.push({ row: rowNum, message: `Invalid role: ${role}. Must be STUDENT, FACULTY, or ADMIN` });
          continue;
        }

        // Create user and RFID card atomically
        const hashedPassword = await bcrypt.hash(password, 12);
        await prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              name,
              email,
              password: hashedPassword,
              rollNo,
              department,
              role: role as any,
              rfidUid,
            },
            select: { id: true },
          });

          if (rfidUid) {
            await tx.rfidCard.create({
              data: { uid: rfidUid, userId: user.id },
            });
          }
        });

        successCount++;
      } catch (err: any) {
        errors.push({ row: rowNum, message: err.message || "Unknown error" });
      }
    }

    // Send response
    res.json({
      message: "Import completed",
      summary: {
        total: data.length,
        success: successCount,
        skipped: skippedCount,
        failed: errors.length,
      },
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Bulk import error:", error);
    res.status(500).json({ error: "Failed to process import file" });
  }
}

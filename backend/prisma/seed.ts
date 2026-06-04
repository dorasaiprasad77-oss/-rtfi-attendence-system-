import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create default admin account only — all other data is entered by the admin
  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@school.edu" },
    update: {},
    create: {
      name: "System Admin",
      email: "admin@school.edu",
      password: adminPassword,
      role: "ADMIN",
      department: "Administration",
    },
  });
  console.log(`✅ Admin account created: ${admin.email}`);

  console.log("\n🎉 Database seeded successfully!");
  console.log("📧 Default admin login: admin@school.edu / admin123");
  console.log("ℹ️  All users, devices, and attendance data should be added through the dashboard.");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });

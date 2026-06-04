import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "RFID Access Control",
  description: "Smart RFID-Based Attendance and Access Control System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0f1117] text-white antialiased">{children}</body>
    </html>
  );
}

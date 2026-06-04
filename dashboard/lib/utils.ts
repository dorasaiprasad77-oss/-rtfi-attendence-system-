export function formatTime(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateShort(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return formatDate(date);
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function statusColor(status: string): string {
  switch (status?.toUpperCase()) {
    case "PRESENT":
    case "GRANTED":
    case "ONLINE":
      return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
    case "ABSENT":
    case "DENIED":
    case "OFFLINE":
      return "text-red-400 bg-red-400/10 border-red-400/20";
    case "LATE":
    case "MAINTENANCE":
      return "text-amber-400 bg-amber-400/10 border-amber-400/20";
    case "EXCUSED":
      return "text-blue-400 bg-blue-400/10 border-blue-400/20";
    default:
      return "text-white/50 bg-white/5 border-white/10";
  }
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

// Browser notification utilities
// Handles service worker registration, permission requests, and showing notifications

let swRegistration: ServiceWorkerRegistration | null = null;

// Register the service worker
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  if (swRegistration) return swRegistration;

  try {
    swRegistration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });
    return swRegistration;
  } catch (error) {
    console.error("Service worker registration failed:", error);
    return null;
  }
}

// Get the current notification permission status
export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

// Request notification permission from the user
export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  await registerServiceWorker();
  const permission = await Notification.requestPermission();
  return permission;
}

// Check if the document/tab is currently visible
export function isDocumentHidden(): boolean {
  return typeof document !== "undefined" ? document.hidden : false;
}

// Show a local notification — only fires when tab is not focused to avoid duplicates
export function showLocalNotification(
  title: string,
  options: { tag?: string; data?: Record<string, any>; body?: string }
): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  // Only show browser notification when tab is not visible — the in-app feed handles visible state
  if (!isDocumentHidden()) return;

  // Use the Notification constructor directly with only known properties
  const notification = new Notification(title, {
    body: options.body,
    icon: "/icon-192.png",
    badge: "/badge-72.png",
    tag: options.tag,
  });

  // Auto-close after 5 seconds
  setTimeout(() => notification.close(), 5000);
}

// Notification templates for attendance events
export const notifications = {
  attendanceGranted(user: { name: string; rollNo?: string | null; department?: string | null }) {
    const subtitle = [user.rollNo, user.department].filter(Boolean).join(" · ");
    showLocalNotification("✅ Attendance Recorded", {
      body: `${user.name}${subtitle ? ` — ${subtitle}` : ""} checked in successfully.`,
      tag: `attendance-${user.name}`,
      data: { url: "/dashboard" },
    });
  },

  accessDenied(user: { name: string; rollNo?: string | null }, deviceLocation?: string) {
    showLocalNotification("🚫 Access Denied", {
      body: `Unknown RFID card scanned${deviceLocation ? ` at ${deviceLocation}` : ""}.`,
      tag: "access-denied",
      data: { url: "/dashboard" },
    });
  },

  deviceOffline(deviceName: string, location: string) {
    showLocalNotification("⚠️ Device Offline", {
      body: `${deviceName} (${location}) has gone offline.`,
      tag: `device-${deviceName}`,
      data: { url: "/dashboard/devices" },
    });
  },
};

// Check if notifications are enabled in user preferences
export function areNotificationsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const stored = localStorage.getItem("rfid_notifications_enabled");
  if (stored === null) return true; // default to enabled
  return stored === "true";
}

export function setNotificationsEnabled(enabled: boolean): void {
  localStorage.setItem("rfid_notifications_enabled", String(enabled));
}

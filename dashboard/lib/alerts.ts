// Audio alert utilities for the dashboard
// Plays alert sounds for denied access events using the Web Audio API
// No external audio files needed — generates tones programmatically

const SOUND_PREF_KEY = "rfid_sound_alerts_enabled";

// Singleton AudioContext — created on first user gesture, reused across all alerts
let sharedCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return null;

  if (!sharedCtx) {
    sharedCtx = new AudioCtx();
  }

  // Resume if suspended (browser autoplay policy)
  if (sharedCtx.state === "suspended") {
    sharedCtx.resume();
  }

  return sharedCtx;
}

// Generate alert tones using the shared AudioContext
function playAlertTone(
  ctx: AudioContext,
  frequency: number,
  startTime: number,
  duration: number
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = frequency;
  osc.type = "square";
  gain.gain.setValueAtTime(0.3, startTime);
  gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

// Ensure AudioContext is ready (call from a user gesture handler)
export function unlockAudio(): void {
  getAudioContext();
}

// Play a sharp 3-beep denied access alarm
export function playDeniedAlert(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const t = ctx.currentTime;
  playAlertTone(ctx, 880, t, 0.15);
  playAlertTone(ctx, 880, t + 0.25, 0.15);
  playAlertTone(ctx, 880, t + 0.50, 0.20);
}

// Play a soft success chime for granted access
export function playGrantedChime(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const t = ctx.currentTime;
  playAlertTone(ctx, 523, t, 0.12);
  playAlertTone(ctx, 659, t + 0.20, 0.12);
}

// Play a low warning tone for device offline
export function playDeviceOfflineAlert(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  playAlertTone(ctx, 330, ctx.currentTime, 0.30);
}

// Check if sound alerts are enabled in user preferences
export function areSoundAlertsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const stored = localStorage.getItem(SOUND_PREF_KEY);
  if (stored === null) return false; // default to disabled (opt-in)
  return stored === "true";
}

export function setSoundAlertsEnabled(enabled: boolean): void {
  localStorage.setItem(SOUND_PREF_KEY, String(enabled));
}

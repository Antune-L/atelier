import type { NotificationSoundKind } from "@shared/schemas";

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

const SOUND_STORAGE_KEY = "kanban:notification-sound-enabled";
const STORED_DISABLED = "false";
const NOTE_DURATION_SECONDS = 0.16;
const NOTE_GAIN = 0.06;
const ATTACK_SECONDS = 0.015;
const END_GAIN = 0.001;
const PR_FREQUENCIES = [660, 880];
const COMPLETION_FREQUENCIES = [440, 523, 660];
const active = new Set<Notification>();
let audioContext: AudioContext | null = null;

export function getStoredSoundEnabled(): boolean {
  try {
    return localStorage.getItem(SOUND_STORAGE_KEY) !== STORED_DISABLED;
  } catch {
    return true;
  }
}

export function storeSoundEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(SOUND_STORAGE_KEY, String(enabled));
  } catch {
    return;
  }
}

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? window.webkitAudioContext;
  if (typeof Ctor === "undefined") return null;
  audioContext ??= new Ctor();
  return audioContext;
}

function playTones(context: AudioContext, kind: NotificationSoundKind): void {
  if (context.state !== "running") return;
  const frequencies = kind === "pr" ? PR_FREQUENCIES : COMPLETION_FREQUENCIES;
  const start = context.currentTime;
  frequencies.forEach((frequency, index) => {
    const noteStart = start + index * NOTE_DURATION_SECONDS;
    const noteEnd = noteStart + NOTE_DURATION_SECONDS;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, noteStart);
    gain.gain.setValueAtTime(END_GAIN, noteStart);
    gain.gain.linearRampToValueAtTime(NOTE_GAIN, noteStart + ATTACK_SECONDS);
    gain.gain.exponentialRampToValueAtTime(END_GAIN, noteEnd);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
    oscillator.start(noteStart);
    oscillator.stop(noteEnd);
  });
}

export function playNotificationSound(kind: NotificationSoundKind = "completion"): void {
  try {
    const context = getAudioContext();
    if (!context) return;
    if (context.state === "suspended") {
      void context.resume().then(() => playTones(context, kind)).catch(() => undefined);
      return;
    }
    playTones(context, kind);
  } catch {
    return;
  }
}

const isSupported = (): boolean => typeof Notification !== "undefined";

/**
 * Arms desktop notifications. The permission prompt is deferred to the first
 * user gesture because Safari/WebKit (and Chrome's abuse heuristics) ignore a
 * request made on page load, which would leave the feature permanently inert.
 */
export function ensureNotificationPermission(): void {
  const request = (): void => {
    try {
      const context = getAudioContext();
      if (context?.state === "suspended") void context.resume().catch(() => undefined);
      if (isSupported() && Notification.permission === "default") {
        void Notification.requestPermission().catch(() => undefined);
      }
    } catch {
      return;
    }
  };
  window.addEventListener("pointerdown", request, { once: true });
}

/**
 * Shows a desktop notification when the tab isn't the user's focus — when it is
 * the in-app toast already covers it. Clicking focuses the browser tab and, when
 * `onClick` is provided (the notification maps to a ticket), runs it.
 */
export function showDesktopNotification(title: string, body: string, onClick?: () => void): void {
  if (!isSupported() || Notification.permission !== "granted") return;
  if (!document.hidden && document.hasFocus()) return;

  const notification = new Notification(title, { body, silent: true });
  active.add(notification);
  notification.onclick = () => {
    window.focus();
    onClick?.();
    notification.close();
  };
  notification.onclose = () => active.delete(notification);
}

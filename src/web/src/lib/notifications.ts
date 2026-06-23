/**
 * Desktop notifications fired from the browser so a click focuses this tab
 * instead of opening whatever native app emitted an OS-level notification.
 */

const NOTIFICATION_SOUND_PATH = "/mouse.mp3";

// Retain references so the notification (and its onclick closure) isn't GC'd
// before the user clicks it.
const active = new Set<Notification>();

// Reused across calls so rapid notifications don't spawn overlapping Audio
// elements; created lazily so importing this module has no side effects.
let sound: HTMLAudioElement | null = null;

/**
 * Plays the notification sound. Browsers block audio playback without a prior
 * user gesture, so the returned promise rejection is swallowed to avoid noise.
 */
export function playNotificationSound(): void {
  if (typeof Audio === "undefined") return;

  sound ??= new Audio(NOTIFICATION_SOUND_PATH);
  sound.currentTime = 0;
  void sound.play().catch(() => {
    // Autoplay was blocked (no user gesture yet); nothing actionable here.
  });
}

const isSupported = (): boolean => typeof Notification !== "undefined";

/**
 * Arms desktop notifications. The permission prompt is deferred to the first
 * user gesture because Safari/WebKit (and Chrome's abuse heuristics) ignore a
 * request made on page load, which would leave the feature permanently inert.
 */
export function ensureNotificationPermission(): void {
  if (!isSupported() || Notification.permission !== "default") return;
  const request = (): void => void Notification.requestPermission();
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

  const notification = new Notification(title, { body });
  active.add(notification);
  notification.onclick = () => {
    window.focus();
    onClick?.();
    notification.close();
  };
  notification.onclose = () => active.delete(notification);
}

/**
 * Desktop notifications fired from the browser so a click focuses this tab
 * instead of opening whatever native app emitted an OS-level notification.
 */

// Retain references so the notification (and its onclick closure) isn't GC'd
// before the user clicks it.
const active = new Set<Notification>();

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
 * the in-app toast already covers it. Clicking focuses the browser tab.
 */
export function showDesktopNotification(title: string, body: string): void {
  if (!isSupported() || Notification.permission !== "granted") return;
  if (!document.hidden && document.hasFocus()) return;

  const notification = new Notification(title, { body });
  active.add(notification);
  notification.onclick = () => {
    window.focus();
    notification.close();
  };
  notification.onclose = () => active.delete(notification);
}

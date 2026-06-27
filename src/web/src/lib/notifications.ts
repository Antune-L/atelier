/**
 * Desktop notifications fired from the browser so a click focuses this tab
 * instead of opening whatever native app emitted an OS-level notification.
 */

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

const NOTIFICATION_SOUND_PATH = "/mouse.mp3";

// Retain references so the notification (and its onclick closure) isn't GC'd
// before the user clicks it.
const active = new Set<Notification>();

// Web Audio API instead of HTMLAudioElement: the latter registers the app as an
// OS media source via the Media Session API, so media keys (pause/play) focus
// this app. The Web Audio API never touches Media Session. Created lazily so
// importing this module has no side effects; the decoded buffer and its fetch
// promise are cached so rapid calls don't refetch/redecode.
let audioContext: AudioContext | null = null;
let soundBuffer: AudioBuffer | null = null;
let soundLoad: Promise<AudioBuffer | null> | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? window.webkitAudioContext;
  if (typeof Ctor === "undefined") return null;
  audioContext ??= new Ctor();
  return audioContext;
}

function loadSoundBuffer(context: AudioContext): Promise<AudioBuffer | null> {
  soundLoad ??= fetch(NOTIFICATION_SOUND_PATH)
    .then((res) => res.arrayBuffer())
    .then((data) => context.decodeAudioData(data))
    .then((buffer) => {
      soundBuffer = buffer;
      return buffer;
    })
    .catch(() => {
      soundLoad = null;
      return null;
    });
  return soundLoad;
}

function playBuffer(context: AudioContext, buffer: AudioBuffer): void {
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.connect(context.destination);
  source.start();
}

/**
 * Plays the notification sound. Browsers block audio playback without a prior
 * user gesture, so the suspended-context resume and any failure are swallowed to
 * avoid noise.
 */
export function playNotificationSound(): void {
  const context = getAudioContext();
  if (!context) return;

  const play = (): void => {
    if (soundBuffer) {
      playBuffer(context, soundBuffer);
      return;
    }
    void loadSoundBuffer(context).then((buffer) => {
      if (buffer) playBuffer(context, buffer);
    });
  };

  if (context.state === "suspended") {
    void context.resume().then(play).catch(() => {
      // Autoplay was blocked (no user gesture yet); nothing actionable here.
    });
    return;
  }
  play();
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

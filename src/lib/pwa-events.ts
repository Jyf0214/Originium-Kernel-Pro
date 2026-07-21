/**
 * PWA 事件总线
 * 用于 PWARegister 与 PWAUpdateNotification 之间的通信
 * 基于原生 EventTarget，无需额外依赖
 */

export type PWAUpdateEvent = CustomEvent<{
  registration: ServiceWorkerRegistration;
}>;

const pwaEventTarget = new EventTarget();

/** 触发更新可用事件 */
export function dispatchUpdateAvailable(registration: ServiceWorkerRegistration) {
  pwaEventTarget.dispatchEvent(
    new CustomEvent('pwa-update-available', { detail: { registration } })
  );
}

/** 监听更新可用事件 */
export function onUpdateAvailable(
  handler: (registration: ServiceWorkerRegistration) => void
) {
  const listener = (event: Event) => {
    const customEvent = event as PWAUpdateEvent;
    handler(customEvent.detail.registration);
  };
  pwaEventTarget.addEventListener('pwa-update-available', listener);
  return () => pwaEventTarget.removeEventListener('pwa-update-available', listener);
}

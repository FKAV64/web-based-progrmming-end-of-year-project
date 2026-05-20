let apexchartsWheelPatchApplied = false;

export function ensureApexchartsWheelPatch(): void {
  if (apexchartsWheelPatchApplied || typeof EventTarget === 'undefined') {
    return;
  }

  const originalAddEventListener = EventTarget.prototype.addEventListener;

  EventTarget.prototype.addEventListener = function (
    this: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ): void {
    if (type === 'wheel') {
      const normalizedOptions =
        typeof options === 'object' && options !== null
          ? { ...options, passive: false }
          : { passive: false, capture: options === true };

      originalAddEventListener.call(this, type, listener, normalizedOptions);
      return;
    }

    originalAddEventListener.call(this, type, listener, options);
  };

  apexchartsWheelPatchApplied = true;
}

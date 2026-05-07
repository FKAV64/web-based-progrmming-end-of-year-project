import { OverlayContainer } from '@angular/cdk/overlay';
import { Injectable } from '@angular/core';

/**
 * Custom CDK overlay container that mirrors the dark mode class
 * from the document root onto the overlay container.
 * This ensures Material dropdowns, dialogs, and menus respect
 * the Tailwind dark mode class applied to <html>.
 */
@Injectable({ providedIn: 'root' })
export class DarkModeOverlayContainer extends OverlayContainer {
  override _createContainer(): void {
    super._createContainer();
    this._syncDarkClass();
    // Watch for dark class changes on <html>
    const observer = new MutationObserver(() => this._syncDarkClass());
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
  }

  private _syncDarkClass(): void {
    if (!this._containerElement) return;
    const isDark = document.documentElement.classList.contains('dark');
    this._containerElement.classList.toggle('dark', isDark);
  }
}

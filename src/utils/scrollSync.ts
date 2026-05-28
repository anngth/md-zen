import { calculateScrollPercentage } from "./common";

/**
 * High-performance scroll synchronization utilities
 * Optimized for smooth, lag-free scrolling
 */

export class ScrollSyncManager {
  private static programmaticScrollTarget: HTMLElement | null = null;
  private static releaseLockRafId: number | null = null;
  private rafId: number | null = null;
  private previewElement: HTMLElement | null = null;
  private editorElement: HTMLElement | null = null;

  private static isProgrammaticScrollEvent(element: HTMLElement): boolean {
    return ScrollSyncManager.programmaticScrollTarget === element;
  }

  private static runWithProgrammaticScrollLock(
    target: HTMLElement,
    callback: () => void,
  ): void {
    ScrollSyncManager.programmaticScrollTarget = target;
    callback();

    if (ScrollSyncManager.releaseLockRafId) {
      cancelAnimationFrame(ScrollSyncManager.releaseLockRafId);
    }

    ScrollSyncManager.releaseLockRafId = requestAnimationFrame(() => {
      ScrollSyncManager.programmaticScrollTarget = null;
      ScrollSyncManager.releaseLockRafId = null;
    });
  }

  /**
   * Cache DOM elements for better performance
   */
  private cacheElements(): void {
    if (!this.previewElement) {
      this.previewElement = document.querySelector(".preview") as HTMLElement;
    }
    if (!this.editorElement) {
      this.editorElement = document.querySelector(
        ".cm-scroller"
      ) as HTMLElement;
    }
  }

  /**
   * Sync editor scroll to preview with ultra-smooth performance
   */
  syncEditorToPreview = (editorElement: HTMLElement): void => {
    if (ScrollSyncManager.isProgrammaticScrollEvent(editorElement)) return;

    // Coalesce high-frequency scroll events into one update per animation frame.
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }

    // Use requestAnimationFrame for smooth, non-blocking scrolling
    this.rafId = requestAnimationFrame(() => {
      this.cacheElements();

      if (!this.previewElement) return;

      const scrollPercentage = calculateScrollPercentage(
        editorElement.scrollTop,
        editorElement.scrollHeight,
        editorElement.clientHeight
      );

      // Edge snapping and pixel rounding to avoid resistance near extremes
      const editorMax = editorElement.scrollHeight - editorElement.clientHeight;
      const atTop = editorElement.scrollTop <= 1;
      const atBottom = editorMax - editorElement.scrollTop <= 1;

      const previewScrollHeight =
        this.previewElement.scrollHeight - this.previewElement.clientHeight;
      const clamped = Math.min(1, Math.max(0, scrollPercentage));
      const targetScrollTop = atTop
        ? 0
        : atBottom
        ? previewScrollHeight
        : clamped * previewScrollHeight;

      if (Math.abs(this.previewElement.scrollTop - targetScrollTop) > 1) {
        const target = this.previewElement;
        ScrollSyncManager.runWithProgrammaticScrollLock(target, () => {
          target.scrollTop = targetScrollTop;
        });
      }
    });
  };

  /**
   * Sync preview scroll to editor with ultra-smooth performance
   */
  syncPreviewToEditor = (previewElement: HTMLElement): void => {
    if (ScrollSyncManager.isProgrammaticScrollEvent(previewElement)) return;

    // Coalesce high-frequency scroll events into one update per animation frame.
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }

    // Use requestAnimationFrame for smooth, non-blocking scrolling
    this.rafId = requestAnimationFrame(() => {
      this.cacheElements();

      if (!this.editorElement) return;

      const scrollPercentage = calculateScrollPercentage(
        previewElement.scrollTop,
        previewElement.scrollHeight,
        previewElement.clientHeight
      );

      // Edge snapping and pixel rounding to avoid resistance near extremes
      const previewMax =
        previewElement.scrollHeight - previewElement.clientHeight;
      const atTop = previewElement.scrollTop <= 1;
      const atBottom = previewMax - previewElement.scrollTop <= 1;

      const editorScrollHeight =
        this.editorElement.scrollHeight - this.editorElement.clientHeight;
      const clamped = Math.min(1, Math.max(0, scrollPercentage));
      const targetScrollTop = atTop
        ? 0
        : atBottom
        ? editorScrollHeight
        : clamped * editorScrollHeight;

      if (Math.abs(this.editorElement.scrollTop - targetScrollTop) > 1) {
        const target = this.editorElement;
        ScrollSyncManager.runWithProgrammaticScrollLock(target, () => {
          target.scrollTop = targetScrollTop;
        });
      }
    });
  };

  /**
   * Cleanup animation frames
   */
  cleanup = (): void => {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  };
}

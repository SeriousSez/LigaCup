import { Component, input } from '@angular/core';

/**
 * A single shimmering placeholder bar. Marked aria-hidden because it carries no
 * information: pages announce their loading state separately for screen readers.
 */
@Component({
    selector: 'app-skeleton',
    template: '',
    host: {
        'aria-hidden': 'true',
        '[style.width]': 'width()',
        '[style.height]': 'height()',
        '[style.border-radius]': 'radius()',
    },
    styles: `
    :host {
      display: block;
      background: linear-gradient(
        90deg,
        var(--surface-raised) 25%,
        var(--surface-line) 37%,
        var(--surface-raised) 63%
      );
      background-size: 400% 100%;
      animation: skeleton-shimmer 1.4s ease infinite;
    }

    @keyframes skeleton-shimmer {
      0% {
        background-position: 100% 50%;
      }
      100% {
        background-position: 0 50%;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      :host {
        animation: none;
      }
    }
  `,
})
export class Skeleton {
    readonly width = input('100%');
    readonly height = input('1rem');
    readonly radius = input('8px');
}

import { Component, HostListener, input, output } from '@angular/core';

@Component({
    selector: 'app-confirm-dialog',
    template: `
    @if (open()) {
      <div class="backdrop" role="presentation">
        <section class="dialog" role="alertdialog" aria-modal="true" [attr.aria-labelledby]="titleId" [attr.aria-describedby]="messageId">
          <h2 [id]="titleId">{{ title() }}</h2>
          <p [id]="messageId">{{ message() }}</p>
          <div class="actions" [class.has-alternate]="alternateLabel() !== null">
            <button type="button" class="cancel-action" (click)="cancelled.emit()">{{ cancelLabel() }}</button>
            <button type="button" class="danger confirm-action" (click)="confirmed.emit()">{{ confirmLabel() }}</button>
            @if (alternateLabel(); as label) {
              <button type="button" class="primary alternate-action" (click)="alternate.emit()">{{ label }}</button>
            }
          </div>
        </section>
      </div>
    }
  `,
    styles: `
    :host {
      position: relative;
      z-index: 100;
    }

    .backdrop {
      position: fixed;
      inset: 0;
      z-index: 1000;
      display: grid;
      place-items: center;
      padding: 1rem;
      background: rgb(0 0 0 / 0.68);
    }

    .dialog {
      width: min(100%, 28rem);
      padding: 1.25rem;
      border: 1px solid var(--accent);
      border-radius: 10px;
      background: var(--surface-raised);
      box-shadow: var(--shadow);
    }

    h2 {
      margin: 0;
      font-size: 1.1rem;
    }

    p {
      margin: 0.7rem 0 0;
      color: var(--text-muted);
      white-space: pre-line;
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      margin-top: 1.1rem;
    }

    .actions.has-alternate {
      display: flex;
      align-items: center;
    }

    .has-alternate .cancel-action { margin-right: auto; }

    .has-alternate .confirm-action {
      border-color: var(--danger);
      background: transparent;
    }

    @media (max-width: 399px) {
      .actions.has-alternate {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .has-alternate .cancel-action { margin-right: 0; }
      .has-alternate .alternate-action { grid-column: 1 / -1; }
      .has-alternate button { width: 100%; }
    }
  `,
})
export class ConfirmDialog {
    readonly open = input(false);
    readonly title = input('');
    readonly message = input('');
    readonly confirmLabel = input('Confirm');
    readonly cancelLabel = input('Cancel');
    readonly alternateLabel = input<string | null>(null);
    readonly confirmed = output<void>();
    readonly cancelled = output<void>();
    readonly alternate = output<void>();

    protected readonly titleId = `confirm-dialog-title-${Math.random().toString(36).slice(2)}`;
    protected readonly messageId = `confirm-dialog-message-${Math.random().toString(36).slice(2)}`;

    @HostListener('document:keydown', ['$event'])
    protected onKeydown(event: KeyboardEvent): void {
        if (!this.open()) {
            return;
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            this.cancelled.emit();
        } else if (event.key === 'Enter') {
            event.preventDefault();
            if (this.alternateLabel()) {
                this.alternate.emit();
            } else {
                this.confirmed.emit();
            }
        }
    }
}

import {
    Component,
    ElementRef,
    HostListener,
    computed,
    forwardRef,
    inject,
    input,
    signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SelectOption<T = unknown> {
    value: T;
    label: string;
    disabled?: boolean;
}

let nextId = 0;

/**
 * Replaces the native select so the options can be themed. Follows the ARIA combobox
 * pattern: focus stays on the trigger and the active option is tracked with
 * aria-activedescendant, which keeps keyboard and screen reader behaviour predictable.
 */
@Component({
    selector: 'app-select',
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => SelectField),
            multi: true,
        },
    ],
    template: `
    <button
      type="button"
      class="trigger"
      role="combobox"
      [attr.aria-expanded]="open()"
      aria-haspopup="listbox"
      [attr.aria-controls]="listId"
      [attr.aria-activedescendant]="open() ? optionId(activeIndex()) : null"
      [attr.aria-label]="label() || null"
      [disabled]="isDisabled()"
      (click)="toggle()"
      (keydown)="onKeydown($event)"
    >
      <span class="value" [class.placeholder]="!selectedOption()">
        {{ selectedOption()?.label ?? placeholder() }}
      </span>
      <i class="fa-duotone fa-solid fa-chevron-down chevron" [class.up]="open()"></i>
    </button>

    @if (open()) {
      <ul class="options" role="listbox" [id]="listId">
        @for (option of options(); track $index) {
          <li
            role="option"
            [id]="optionId($index)"
            [attr.aria-selected]="option.value === value()"
            [class.active]="activeIndex() === $index"
            [class.selected]="option.value === value()"
            [class.disabled]="option.disabled === true"
            (mouseenter)="activeIndex.set($index)"
            (click)="choose($index)"
          >
            <span>{{ option.label }}</span>
            @if (option.value === value()) {
              <i class="fa-duotone fa-solid fa-check"></i>
            }
          </li>
        }
      </ul>
    }
  `,
    styles: `
    :host {
      position: relative;
      display: block;
    }

    .trigger {
      width: 100%;
      display: grid;
      grid-template-columns: 1fr auto;
      align-items: center;
      gap: 0.5rem;
      text-align: left;
      background: var(--pitch-800);
      font-size: 16px;
    }

    .value {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .value.placeholder {
      color: var(--text-muted);
    }

    .chevron {
      color: var(--text-muted);
      font-size: 0.8rem;
      transition: transform 120ms ease;
    }

    .chevron.up {
      transform: rotate(180deg);
    }

    .options {
      position: absolute;
      z-index: 30;
      top: calc(100% + 0.25rem);
      left: 0;
      right: 0;
      margin: 0;
      padding: 0.25rem;
      list-style: none;
      background: var(--surface-raised);
      border: 1px solid var(--accent);
      border-radius: 10px;
      box-shadow: var(--shadow);
      max-height: min(50vh, 320px);
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
    }

    li {
      display: grid;
      grid-template-columns: 1fr auto;
      align-items: center;
      gap: 0.5rem;
      padding: 0.6rem 0.65rem;
      min-height: var(--tap);
      border-radius: 8px;
      cursor: pointer;
      color: var(--text);
    }

    li span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    li.active {
      background: var(--surface-line);
    }

    li.selected {
      color: var(--accent);
      font-weight: 600;
    }

    li.disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    li i {
      font-size: 0.8rem;
    }
  `,
})
export class SelectField<T = unknown> implements ControlValueAccessor {
    readonly options = input<SelectOption<T>[]>([]);
    readonly placeholder = input('');
    readonly label = input('');

    private readonly host = inject(ElementRef<HTMLElement>);
    private readonly instance = nextId++;

    protected readonly listId = `select-list-${this.instance}`;
    protected readonly open = signal(false);
    protected readonly activeIndex = signal(0);
    protected readonly value = signal<T | null>(null);
    protected readonly isDisabled = signal(false);

    protected readonly selectedOption = computed(
        () => this.options().find((option) => option.value === this.value()) ?? null,
    );

    private onChange: (value: T | null) => void = () => {};
    private onTouched: () => void = () => {};

    writeValue(value: T | null): void {
        this.value.set(value);
    }

    registerOnChange(fn: (value: T | null) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        this.isDisabled.set(isDisabled);
    }

    protected optionId(index: number): string {
        return `${this.listId}-option-${index}`;
    }

    protected toggle(): void {
        this.open() ? this.close() : this.openList();
    }

    protected choose(index: number): void {
        const option = this.options()[index];
        if (!option || option.disabled) {
            return;
        }

        this.value.set(option.value);
        this.onChange(option.value);
        this.close();
    }

    protected onKeydown(event: KeyboardEvent): void {
        if (!this.open()) {
            if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
                event.preventDefault();
                this.openList();
            }
            return;
        }

        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                this.move(1);
                break;
            case 'ArrowUp':
                event.preventDefault();
                this.move(-1);
                break;
            case 'Home':
                event.preventDefault();
                this.activeIndex.set(0);
                break;
            case 'End':
                event.preventDefault();
                this.activeIndex.set(this.options().length - 1);
                break;
            case 'Enter':
            case ' ':
                event.preventDefault();
                this.choose(this.activeIndex());
                break;
            case 'Escape':
            case 'Tab':
                this.close();
                break;
        }
    }

    @HostListener('document:click', ['$event'])
    protected onDocumentClick(event: MouseEvent): void {
        if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
            this.close();
        }
    }

    private openList(): void {
        if (this.isDisabled()) {
            return;
        }

        const selected = this.options().findIndex((option) => option.value === this.value());
        this.activeIndex.set(selected >= 0 ? selected : 0);
        this.open.set(true);
    }

    private close(): void {
        if (!this.open()) {
            return;
        }

        this.open.set(false);
        this.onTouched();
    }

    /** Steps over disabled options so keyboard users never land on one. */
    private move(direction: number): void {
        const options = this.options();
        if (options.length === 0) {
            return;
        }

        let index = this.activeIndex();
        for (let step = 0; step < options.length; step++) {
            index = (index + direction + options.length) % options.length;
            if (!options[index].disabled) {
                this.activeIndex.set(index);
                return;
            }
        }
    }
}

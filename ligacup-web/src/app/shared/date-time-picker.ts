import { Component, ElementRef, HostListener, forwardRef, inject, input, signal } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { I18nService } from '../core/i18n/i18n.service';

@Component({
    selector: 'app-date-time-picker',
    imports: [FormsModule],
    providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => DateTimePicker), multi: true }],
    template: `
    <div class="picker">
      <button class="picker-input" type="button" [disabled]="disabled()" (click)="toggle()">
        <span>{{ displayValue() || placeholder() || t().datePicker.placeholder }}</span>
        <i class="fa-duotone fa-solid fa-calendar-days" aria-hidden="true"></i>
      </button>
      @if (open()) {
        <div class="calendar" role="dialog" [attr.aria-label]="ariaLabel() || t().datePicker.ariaLabel">
          <div class="calendar-header">
            <button type="button" class="icon-button" (click)="previousMonth()" [attr.aria-label]="t().datePicker.previousMonth">&lsaquo;</button>
            <div class="month-title">
              <button type="button" (click)="calendarView.set('months')">{{ monthName() }}</button>
              <button type="button" (click)="calendarView.set('years')">{{ year() }}</button>
            </div>
            <button type="button" class="icon-button" (click)="nextMonth()" [attr.aria-label]="t().datePicker.nextMonth">&rsaquo;</button>
          </div>
          @if (calendarView() === 'days') {
            <div class="weekdays">@for (weekday of t().datePicker.weekdays; track $index) { <span>{{ weekday }}</span> }</div>
            <div class="days">
              @for (day of days(); track day.value) {
                <button type="button" [class.other-month]="!day.inMonth" [class.today]="day.today" [class.selected]="day.value === dateValue()" (click)="selectDate(day.value)">{{ day.label }}</button>
              }
            </div>
            <label class="time-field">{{ t().datePicker.time }} <input type="time" [(ngModel)]="timeValue" (ngModelChange)="updateTime($event)" /></label>
          } @else if (calendarView() === 'months') {
            <div class="choice-grid months">@for (month of months(); track month.index) { <button type="button" [class.selected]="month.index === viewDate().getMonth()" (click)="selectMonth(month.index)">{{ month.label }}</button> }</div>
          } @else {
            <div class="choice-grid years">@for (option of years(); track option) { <button type="button" [class.selected]="option === year()" (click)="selectYear(option)">{{ option }}</button> }</div>
          }
          <div class="calendar-footer"><button type="button" class="clear" (click)="clear()">{{ t().datePicker.clear }}</button><button type="button" class="today-button" (click)="today()">{{ t().datePicker.today }}</button></div>
        </div>
      }
    </div>
  `,
    styles: `
    :host { display: block; position: relative; width: 100%; align-self: end; }
    .picker { width: 100%; }
    .picker-input { width: 100%; min-height: var(--tap); box-sizing: border-box; display: flex; align-items: center; justify-content: space-between; gap: 0.6rem; padding: 0.6rem 0.7rem; border: 1px solid var(--surface-line); border-radius: 10px; font: inherit; font-size: 16px; text-align: left; color: var(--text); background: var(--pitch-800); }
    .picker-input i { color: var(--accent); }
    .calendar { position: absolute; top: calc(100% + 0.45rem); left: 0; width: min(19rem, calc(100vw - 2rem)); padding: 0.8rem; border: 1px solid var(--surface-line); border-radius: 12px; background: var(--surface-raised); box-shadow: var(--shadow); z-index: 50; }
    .calendar-header, .weekdays, .days, .calendar-footer { display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.25rem; }
    .calendar-header { grid-template-columns: auto 1fr auto; align-items: center; margin-bottom: 0.65rem; }
    .month-title { display: flex; justify-content: center; gap: 0.25rem; }
    .month-title button { min-height: 2rem; padding: 0 0.2rem; border: 0; background: transparent; color: var(--text); font-weight: 700; }
    .icon-button { min-height: 2rem; width: 2rem; padding: 0; }
    .weekdays { margin-bottom: 0.25rem; color: var(--text-muted); font-size: 0.7rem; text-align: center; }
    .days button { min-height: 2rem; padding: 0; border: 0; border-radius: 7px; background: transparent; color: var(--text); }
    .days button:hover, .days button.today { border: 1px solid var(--accent); }
    .days button.other-month { color: var(--text-muted); opacity: 0.55; }
    .days button.selected { background: var(--accent-strong); color: var(--pitch-900); font-weight: 700; }
    .time-field { display: flex; align-items: center; justify-content: space-between; margin-top: 0.8rem; color: var(--text-muted); font-size: 0.8rem; }
    .time-field input { width: 7rem; min-height: 2.2rem; padding: 0.35rem 0.5rem; }
    .calendar-footer { grid-template-columns: 1fr 1fr; margin-top: 0.7rem; }
    .clear, .today-button { min-height: 2.2rem; padding: 0.35rem; }
    .clear { color: var(--danger); }
    .today-button { background: var(--pitch-700); color: var(--accent); }
    .choice-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.35rem; }
    .choice-grid button { min-height: 2.5rem; padding: 0.35rem; }
    .choice-grid button.selected { background: var(--accent-strong); color: var(--pitch-900); font-weight: 700; }
  `,
})
export class DateTimePicker implements ControlValueAccessor {
    readonly placeholder = input<string | null>(null);
    readonly ariaLabel = input<string | null>(null);
    protected readonly open = signal(false);
    protected readonly disabled = signal(false);
    protected readonly dateValue = signal('');
    protected readonly viewDate = signal(new Date());
    protected readonly calendarView = signal<'days' | 'months' | 'years'>('days');
    protected timeValue = '15:00';
    private onChange: (value: string) => void = () => undefined;
    private onTouched: () => void = () => undefined;
    private readonly element = inject(ElementRef<HTMLElement>);
    private readonly i18n = inject(I18nService);
    protected readonly t = this.i18n.t;
    protected readonly locale = this.i18n.locale;

    displayValue(): string { const value = this.dateValue(); if (!value) return ''; const date = new Date(`${value}T00:00`); return `${date.toLocaleDateString(this.locale(), { day: '2-digit', month: '2-digit', year: 'numeric' })} ${this.timeValue}`; }
    monthName(): string { return this.viewDate().toLocaleDateString(this.locale(), { month: 'long' }); }
    year(): number { return this.viewDate().getFullYear(); }
    months(): { index: number; label: string }[] { return Array.from({ length: 12 }, (_, index) => ({ index, label: new Date(this.year(), index, 1).toLocaleDateString(this.locale(), { month: 'short' }) })); }
    years(): number[] { return Array.from({ length: 12 }, (_, index) => this.year() - 5 + index); }
    days(): { value: string; label: string; inMonth: boolean; today: boolean }[] { const view = this.viewDate(); const first = new Date(view.getFullYear(), view.getMonth(), 1); const start = new Date(first); start.setDate(1 - ((first.getDay() + 6) % 7)); const today = this.toDateValue(new Date()); return Array.from({ length: 42 }, (_, index) => { const date = new Date(start); date.setDate(start.getDate() + index); const value = this.toDateValue(date); return { value, label: String(date.getDate()), inMonth: date.getMonth() === view.getMonth(), today: value === today }; }); }
    writeValue(value: string | null): void { const [date, time] = (value ?? '').split('T'); this.dateValue.set(date || ''); if (time) this.timeValue = time.slice(0, 5); if (date) this.viewDate.set(new Date(`${date}T00:00`)); }
    registerOnChange(fn: (value: string) => void): void { this.onChange = fn; }
    registerOnTouched(fn: () => void): void { this.onTouched = fn; }
    setDisabledState(value: boolean): void { this.disabled.set(value); }
    toggle(): void { if (!this.disabled()) { this.open.update((value) => !value); this.calendarView.set('days'); } }
    selectDate(value: string): void { this.dateValue.set(value); this.calendarView.set('days'); this.emit(); }
    selectMonth(month: number): void { this.viewDate.set(new Date(this.year(), month, 1)); this.calendarView.set('days'); }
    selectYear(year: number): void { this.viewDate.set(new Date(year, this.viewDate().getMonth(), 1)); this.calendarView.set('months'); }
    updateTime(value: string): void { this.timeValue = value; this.emit(); }
    previousMonth(): void {
        const date = this.viewDate();
        this.viewDate.set(new Date(
            this.calendarView() === 'years' ? date.getFullYear() - 12 : this.calendarView() === 'months' ? date.getFullYear() - 1 : date.getFullYear(),
            this.calendarView() === 'days' ? date.getMonth() - 1 : date.getMonth(),
            1,
        ));
    }
    nextMonth(): void {
        const date = this.viewDate();
        this.viewDate.set(new Date(
            this.calendarView() === 'years' ? date.getFullYear() + 12 : this.calendarView() === 'months' ? date.getFullYear() + 1 : date.getFullYear(),
            this.calendarView() === 'days' ? date.getMonth() + 1 : date.getMonth(),
            1,
        ));
    }
    today(): void { const date = new Date(); this.dateValue.set(this.toDateValue(date)); this.viewDate.set(new Date(date.getFullYear(), date.getMonth(), 1)); this.emit(); }
    clear(): void { this.dateValue.set(''); this.onChange(''); this.onTouched(); this.open.set(false); }
    @HostListener('document:click', ['$event']) closeWhenOutside(event: MouseEvent): void { if (!this.element.nativeElement.contains(event.target as Node)) { this.open.set(false); this.onTouched(); } }
    private emit(): void { if (this.dateValue()) this.onChange(`${this.dateValue()}T${this.timeValue}`); }
    private toDateValue(date: Date): string { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
}

import { Component, input } from '@angular/core';
import { Skeleton } from './skeleton';

@Component({
    selector: 'app-heading-skeleton',
    imports: [Skeleton],
    template: `
    <div class="heading">
      <app-skeleton width="60%" height="2rem" />
      <app-skeleton width="40%" height="0.9rem" />
    </div>
  `,
    styles: `
    .heading {
      display: grid;
      gap: 0.5rem;
      margin-bottom: 1.25rem;
      max-width: 420px;
    }
  `,
})
export class HeadingSkeleton { }

@Component({
    selector: 'app-card-list-skeleton',
    imports: [Skeleton],
    template: `
    <div class="grid-auto">
      @for (card of placeholders(); track $index) {
        <div class="card stack">
          <div class="spread">
            <app-skeleton width="55%" height="1.2rem" />
            <app-skeleton width="3rem" height="1.2rem" radius="999px" />
          </div>
          <app-skeleton width="85%" height="0.85rem" />
          <div class="row">
            <app-skeleton width="4rem" height="0.8rem" />
            <app-skeleton width="5rem" height="0.8rem" />
            <app-skeleton width="4.5rem" height="0.8rem" />
          </div>
        </div>
      }
    </div>
  `,
})
export class CardListSkeleton {
    readonly count = input(3);
    placeholders = () => Array.from({ length: this.count() });
}

@Component({
    selector: 'app-standings-skeleton',
    imports: [Skeleton],
    template: `
    <div class="tables">
      @for (table of placeholders(); track $index) {
        <div class="card stack">
          <app-skeleton width="35%" height="1.1rem" />
          <div class="rows">
            @for (row of rowPlaceholders(); track $index) {
              <div class="row-line">
                <app-skeleton width="1rem" height="0.9rem" />
                <app-skeleton height="0.9rem" />
                <app-skeleton width="1.5rem" height="0.9rem" />
                <app-skeleton width="1.5rem" height="0.9rem" />
                <app-skeleton width="1.5rem" height="0.9rem" />
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
    styles: `
    .tables {
      display: grid;
      gap: 0.75rem;
      grid-template-columns: repeat(auto-fit, minmax(min(520px, 100%), 1fr));
    }

    .rows {
      display: grid;
      gap: 0.85rem;
      margin-top: 0.4rem;
    }

    .row-line {
      display: grid;
      grid-template-columns: 1rem 1fr 1.5rem 1.5rem 1.5rem;
      gap: 0.5rem;
      align-items: center;
    }
  `,
})
export class StandingsSkeleton {
    readonly groups = input(2);
    readonly rows = input(4);
    placeholders = () => Array.from({ length: this.groups() });
    rowPlaceholders = () => Array.from({ length: this.rows() });
}

@Component({
    selector: 'app-scoreboard-skeleton',
    imports: [Skeleton],
    template: `
    <div class="card picker">
      <app-skeleton width="4rem" height="0.8rem" />
      <app-skeleton height="2.75rem" radius="10px" />
    </div>

    <div class="card stack">
      <div class="centre">
        <app-skeleton width="5rem" height="1.4rem" radius="999px" />
      </div>

      @for (team of [0, 1]; track $index) {
        <div class="team">
          <app-skeleton width="45%" height="1.05rem" />
          <div class="counter">
            <app-skeleton height="60px" radius="10px" />
            <app-skeleton width="2ch" height="2.2rem" />
            <app-skeleton height="60px" radius="10px" />
          </div>
        </div>
      }

      <div class="statuses">
        @for (status of [0, 1, 2, 3]; track $index) {
          <app-skeleton height="2.75rem" radius="10px" />
        }
      </div>
    </div>
  `,
    styles: `
    .picker {
      display: grid;
      gap: 0.4rem;
      margin-bottom: 1rem;
    }

    .centre {
      display: flex;
      justify-content: center;
    }

    .team {
      display: grid;
      gap: 0.5rem;
      justify-items: center;
      width: 100%;
    }

    .counter {
      display: grid;
      grid-template-columns: 1fr 3ch 1fr;
      gap: 0.75rem;
      align-items: center;
      width: 100%;
    }

    .statuses {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.5rem;
      margin-top: 0.6rem;
    }
  `,
})
export class ScoreboardSkeleton { }

@Component({
    selector: 'app-form-skeleton',
    imports: [Skeleton],
    template: `
    @for (section of placeholders(); track $index) {
      <div class="card stack section">
        <app-skeleton width="30%" height="1.1rem" />
        <div class="form-grid">
          @for (field of fieldPlaceholders(); track $index) {
            <div class="field">
              <app-skeleton width="60%" height="0.75rem" />
              <app-skeleton height="2.75rem" radius="10px" />
            </div>
          }
        </div>
      </div>
    }
  `,
    styles: `
    .section {
      margin-bottom: 1rem;
    }

    .field {
      display: grid;
      gap: 0.35rem;
    }
  `,
})
export class FormSkeleton {
    readonly sections = input(2);
    readonly fields = input(4);
    placeholders = () => Array.from({ length: this.sections() });
    fieldPlaceholders = () => Array.from({ length: this.fields() });
}

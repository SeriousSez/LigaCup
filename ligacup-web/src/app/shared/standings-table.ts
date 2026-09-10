import { Component, input } from '@angular/core';
import { GroupTable } from '../core/models';

@Component({
    selector: 'app-standings-table',
    template: `
    <div class="card stack">
      <h3>{{ table().groupName }}</h3>
      <table>
        <thead>
          <tr>
            <th class="numeric pos">#</th>
            <th>Team</th>
            <th class="numeric" title="Played">P</th>
            <th class="numeric hide-sm" title="Won">W</th>
            <th class="numeric hide-sm" title="Drawn">D</th>
            <th class="numeric hide-sm" title="Lost">L</th>
            <th class="numeric hide-sm" title="Goals for">GF</th>
            <th class="numeric hide-sm" title="Goals against">GA</th>
            <th class="numeric" title="Goal difference">GD</th>
            <th class="numeric" title="Points">Pts</th>
            <th class="hide-sm">Form</th>
          </tr>
        </thead>
        <tbody>
          @for (row of table().rows; track row.teamId) {
            <tr [class.qualifying]="row.isQualifying">
              <td class="numeric position pos">{{ row.position }}</td>
              <td class="team">
                <span class="team-name">{{ row.teamName }}</span>
                <span class="team-form only-sm">
                  @for (result of row.form; track $index) {
                    <span class="pip small" [class]="result.toLowerCase()"></span>
                  }
                </span>
              </td>
              <td class="numeric">{{ row.played }}</td>
              <td class="numeric hide-sm">{{ row.won }}</td>
              <td class="numeric hide-sm">{{ row.drawn }}</td>
              <td class="numeric hide-sm">{{ row.lost }}</td>
              <td class="numeric hide-sm">{{ row.goalsFor }}</td>
              <td class="numeric hide-sm">{{ row.goalsAgainst }}</td>
              <td class="numeric">{{ row.goalDifference > 0 ? '+' : '' }}{{ row.goalDifference }}</td>
              <td class="numeric points">{{ row.points }}</td>
              <td class="hide-sm">
                <span class="form">
                  @for (result of row.form; track $index) {
                    <span class="pip" [class]="result.toLowerCase()">{{ result }}</span>
                  }
                </span>
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="11" class="muted">No teams in this group yet.</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
    styles: `
    :host {
      display: block;
    }

    table {
      table-layout: fixed;
    }

    .pos {
      width: 2ch;
      padding-inline: 0.15rem;
    }

    .team {
      font-weight: 500;
      white-space: normal;
      width: 100%;
      display: grid;
      gap: 0.2rem;
    }

    .team-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      display: block;
    }

    /* Narrow screens drop the W/D/L/GF/GA columns, so form moves under the team name. */
    .team-form {
      display: flex;
      gap: 0.15rem;
    }

    .points {
      font-weight: 700;
    }

    th.numeric,
    td.numeric {
      width: 3.2ch;
      padding-inline: 0.2rem;
    }

    tr.qualifying .position {
      position: relative;
      color: var(--accent);
      font-weight: 700;
    }

    tr.qualifying .position::before {
      content: '';
      position: absolute;
      left: -0.15rem;
      top: 25%;
      height: 50%;
      border-left: 3px solid var(--accent);
    }

    .form {
      display: inline-flex;
      gap: 0.2rem;
    }

    .pip {
      width: 18px;
      height: 18px;
      display: grid;
      place-items: center;
      border-radius: 5px;
      font-size: 0.66rem;
      font-weight: 700;
      background: var(--surface-line);
    }

    .pip.small {
      width: 12px;
      height: 4px;
      border-radius: 2px;
    }

    .pip.w {
      background: var(--accent-strong);
      color: #04140b;
    }

    .pip.l {
      background: var(--danger);
      color: #fff;
    }

    @media (min-width: 640px) {
      table {
        table-layout: auto;
      }

      th.numeric,
      td.numeric {
        width: auto;
      }

      .team {
        display: table-cell;
        white-space: nowrap;
      }
    }
  `,
})
export class StandingsTable {
    readonly table = input.required<GroupTable>();
}

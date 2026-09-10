import { Component, input } from '@angular/core';
import { GroupTable } from '../core/models';

@Component({
  selector: 'app-standings-table',
  template: `
    <div class="card stack">
      <h3>{{ table().groupName }}</h3>
      <div class="scroll">
        <table>
          <thead>
            <tr>
              <th class="numeric">#</th>
              <th>Team</th>
              <th class="numeric" title="Played">P</th>
              <th class="numeric" title="Won">W</th>
              <th class="numeric" title="Drawn">D</th>
              <th class="numeric" title="Lost">L</th>
              <th class="numeric" title="Goals for">GF</th>
              <th class="numeric" title="Goals against">GA</th>
              <th class="numeric" title="Goal difference">GD</th>
              <th class="numeric" title="Points">Pts</th>
              <th>Form</th>
            </tr>
          </thead>
          <tbody>
            @for (row of table().rows; track row.teamId) {
              <tr [class.qualifying]="row.isQualifying">
                <td class="numeric position">{{ row.position }}</td>
                <td class="team">{{ row.teamName }}</td>
                <td class="numeric">{{ row.played }}</td>
                <td class="numeric">{{ row.won }}</td>
                <td class="numeric">{{ row.drawn }}</td>
                <td class="numeric">{{ row.lost }}</td>
                <td class="numeric">{{ row.goalsFor }}</td>
                <td class="numeric">{{ row.goalsAgainst }}</td>
                <td class="numeric">{{ row.goalDifference > 0 ? '+' : '' }}{{ row.goalDifference }}</td>
                <td class="numeric points">{{ row.points }}</td>
                <td>
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
    </div>
  `,
  styles: `
    .scroll {
      overflow-x: auto;
    }

    .team {
      white-space: nowrap;
      font-weight: 500;
    }

    .points {
      font-weight: 700;
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

    .pip.w {
      background: var(--accent-strong);
      color: #04140b;
    }

    .pip.l {
      background: var(--danger);
      color: #fff;
    }
  `,
})
export class StandingsTable {
  readonly table = input.required<GroupTable>();
}

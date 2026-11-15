import { ChangeDetectionStrategy, Component, inject } from "@angular/core";

import { I18n } from "../../core/i18n";
import { OccupancyCalendar } from "./calendar";
import { Revenue } from "./revenue";

@Component({
  selector: "au-occupancy",
  imports: [OccupancyCalendar, Revenue],
  template: `
    <h1>{{ i18n.t().occTitle }}</h1>
    <p class="lead">{{ i18n.t().occLead }}</p>
    <div class="stack">
      <au-occupancy-calendar />
      <au-revenue />
    </div>
  `,
  styles: `
    .lead {
      color: var(--muted);
      margin: 0 0 1.5rem;
    }
    .stack {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 1.25rem;
    }
    .stack > * {
      min-width: 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Occupancy {
  protected readonly i18n = inject(I18n);
}

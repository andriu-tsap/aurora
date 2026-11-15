import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from "@angular/core";
import type { OwnerStayRow } from "@aurora/demo-data";

import { I18n } from "../../core/i18n";
import { OwnerStore } from "../../core/owner-store";

@Component({
  selector: "au-properties",
  templateUrl: "./properties.html",
  styleUrl: "./properties.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Properties {
  protected readonly i18n = inject(I18n);
  protected readonly store = inject(OwnerStore);
  /** Per-row feedback: "saved" or "invalid", shown in a live region. */
  protected readonly status = signal<Record<string, "saved" | "invalid">>({});

  protected thumb(row: OwnerStayRow): string {
    if (row.photos[0]) return row.photos[0];
    const file = `${row.look.wood}-${row.look.metal}-${row.cover}-600.webp`;
    return new URL(`../stays/renders/${file}`, document.baseURI).href;
  }

  protected save(row: OwnerStayRow, input: HTMLInputElement): void {
    const cents = Math.round(Number(input.value) * 100);
    const ok = Number.isFinite(cents) && this.store.setNightly(row.slug, cents);
    this.status.update((s) => ({ ...s, [row.slug]: ok ? "saved" : "invalid" }));
  }

  protected reset(row: OwnerStayRow): void {
    this.store.reset(row.slug);
    this.status.update((s) => {
      const next = { ...s };
      delete next[row.slug];
      return next;
    });
  }
}

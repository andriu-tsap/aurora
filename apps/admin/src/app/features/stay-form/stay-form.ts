import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
} from "@angular/core";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import {
  ALL_AMENITIES,
  ALL_REGIONS,
  emptyDraft,
  MAX_PHOTOS,
  parseEuro,
  rowToDraft,
  slugify,
  validateDraft,
  type DraftField,
  type OwnerStayRow,
  type StayDraft,
} from "@aurora/demo-data";
import type { Amenity, RegionId } from "@aurora/types";

import { I18n } from "../../core/i18n";
import { OwnerStore } from "../../core/owner-store";
import { PHOTO_TYPES, Photos } from "../../core/photos";

type Errors = Partial<Record<DraftField, true>>;
const ORDER: DraftField[] = [
  "name",
  "maxGuests",
  "nightlyCents",
  "cleaningFeeCents",
  "weeklyDiscountBp",
  "minNights",
];
const FIELD_ID: Record<DraftField, string> = {
  name: "f-name",
  maxGuests: "f-guests",
  nightlyCents: "f-nightly",
  cleaningFeeCents: "f-cleaning",
  weeklyDiscountBp: "f-weekly",
  minNights: "f-min",
};

const toEuroText = (cents: number): string =>
  (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);

@Component({
  selector: "au-stay-form",
  imports: [RouterLink],
  templateUrl: "./stay-form.html",
  styleUrl: "./stay-form.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StayForm {
  protected readonly i18n = inject(I18n);
  protected readonly amenities = ALL_AMENITIES;
  protected readonly regions = ALL_REGIONS;
  protected readonly maxPhotos = MAX_PHOTOS;
  private readonly store = inject(OwnerStore);
  private readonly photoService = inject(Photos);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  private readonly slug = inject(ActivatedRoute).snapshot.paramMap.get("slug");
  /** The row being edited, or undefined when adding a new property. */
  protected readonly row: OwnerStayRow | undefined = this.slug
    ? this.store.rowFor(this.slug)
    : undefined;
  protected readonly isNew = this.slug === null;
  protected readonly isCustom = this.isNew || (this.row?.custom ?? false);

  protected readonly name = signal("");
  protected readonly region = signal<RegionId>("carpathians");
  protected readonly guests = signal("");
  protected readonly nightly = signal("");
  protected readonly cleaning = signal("");
  protected readonly weekly = signal("");
  protected readonly minNights = signal("");
  protected readonly picked = signal<Amenity[]>([]);
  protected readonly photos = signal<string[]>([]);
  protected readonly errors = signal<Errors>({});
  protected readonly dragging = signal(false);
  protected readonly liveMsg = signal("");
  protected readonly saveError = signal(false);
  protected readonly confirmingDelete = signal(false);
  protected readonly invalidCount = computed(() => Object.keys(this.errors()).length);

  constructor() {
    if (!this.isNew && !this.row) {
      void this.router.navigateByUrl("/properties");
      return;
    }
    const d: StayDraft = this.row ? rowToDraft(this.row) : emptyDraft();
    this.name.set(d.name);
    this.region.set(d.region);
    this.guests.set(String(d.maxGuests));
    this.nightly.set(toEuroText(d.nightlyCents));
    this.cleaning.set(toEuroText(d.cleaningFeeCents));
    this.weekly.set(String(d.weeklyDiscountBp / 100));
    this.minNights.set(String(d.minNights));
    this.picked.set(d.amenities);
    this.photos.set(this.row?.photos ?? []);
  }

  protected value(e: Event): string {
    return (e.target as HTMLInputElement).value;
  }

  protected setRegion(e: Event): void {
    const v = this.value(e);
    const known = this.regions.find((r) => r === v);
    if (known) this.region.set(known);
  }

  protected toggle(a: Amenity, e: Event): void {
    const checked = (e.target as HTMLInputElement).checked;
    this.picked.update((list) =>
      checked ? [...list.filter((x) => x !== a), a] : list.filter((x) => x !== a),
    );
  }

  private draft(): StayDraft {
    const whole = (t: string): number => (/^\d{1,3}$/.test(t.trim()) ? Number(t) : NaN);
    const pct = Number(this.weekly().trim().replace(",", "."));
    return {
      name: this.name(),
      region: this.region(),
      maxGuests: whole(this.guests()),
      nightlyCents: parseEuro(this.nightly()) ?? NaN,
      cleaningFeeCents: parseEuro(this.cleaning()) ?? NaN,
      weeklyDiscountBp: Number.isFinite(pct) ? Math.round(pct * 100) : NaN,
      minNights: whole(this.minNights()),
      amenities: this.picked(),
    };
  }

  protected submit(): void {
    const draft = this.draft();
    const bad = validateDraft(draft);
    this.errors.set(bad);
    this.saveError.set(false);
    const first = ORDER.find((f) => bad[f]);
    if (first) {
      this.host.nativeElement.querySelector<HTMLElement>(`#${FIELD_ID[first]}`)?.focus();
      return;
    }
    const slug = this.slug ?? slugify(draft.name, this.store.takenSlugs());
    if (!this.store.save(slug, draft, this.isCustom, this.photos())) {
      this.saveError.set(true);
      return;
    }
    void this.router.navigateByUrl("/properties");
  }

  protected restore(): void {
    if (!this.slug) return;
    this.store.reset(this.slug);
    void this.router.navigateByUrl("/properties");
  }

  protected remove(): void {
    if (!this.slug) return;
    this.store.remove(this.slug);
    void this.router.navigateByUrl("/properties");
  }

  protected isEdited(): boolean {
    return this.slug !== null && this.store.isEdited(this.slug);
  }

  protected onDrop(e: DragEvent): void {
    e.preventDefault();
    this.dragging.set(false);
    void this.addFiles(Array.from(e.dataTransfer?.files ?? []));
  }

  protected onPick(input: HTMLInputElement): void {
    const files = Array.from(input.files ?? []);
    input.value = "";
    void this.addFiles(files);
  }

  private async addFiles(files: File[]): Promise<void> {
    const t = this.i18n.t();
    for (const file of files) {
      if (this.photos().length >= MAX_PHOTOS) {
        this.liveMsg.set(t.photoMax);
        return;
      }
      if (!PHOTO_TYPES.includes(file.type)) {
        this.liveMsg.set(t.photoType);
        continue;
      }
      const url = await this.photoService.compress(file);
      if (!url) {
        this.liveMsg.set(t.photoFail);
        continue;
      }
      this.photos.update((p) => [...p, url]);
      this.liveMsg.set(t.photoAdded);
    }
  }

  protected removePhoto(index: number): void {
    this.photos.update((p) => p.filter((_, i) => i !== index));
    this.liveMsg.set(this.i18n.t().photoRemoved);
  }
}

import { Injectable, computed, signal } from "@angular/core";
import {
  emptyOwnerState,
  ownerRows,
  parseOwnerState,
  removeCustom,
  resetEdits,
  saveStay,
  setNightly,
  stays,
  type OwnerState,
  type OwnerStayRow,
  type StayDraft,
} from "@aurora/demo-data";

const KEY = "aurora-admin-state";

function load(): OwnerState {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? parseOwnerState(JSON.parse(raw) as unknown) : emptyOwnerState();
  } catch {
    return emptyOwnerState();
  }
}

/** Owner edits kept in localStorage; the public site's data is never modified. */
@Injectable({ providedIn: "root" })
export class OwnerStore {
  private readonly state = signal<OwnerState>(load());
  /** False when the last write failed (quota or blocked storage). */
  readonly persisted = signal(true);
  readonly rows = computed(() => ownerRows(stays, this.state()));

  isEdited(slug: string): boolean {
    return slug in this.state().edits;
  }

  rowFor(slug: string): OwnerStayRow | undefined {
    return this.rows().find((r) => r.slug === slug);
  }

  takenSlugs(): Set<string> {
    return new Set(this.rows().map((r) => r.slug));
  }

  setNightly(slug: string, cents: number): boolean {
    const next = setNightly(this.state(), slug, cents);
    if (next === this.state()) return false;
    return this.commit(next);
  }

  /** Saves the edit form; false when the browser refused to store it. */
  save(slug: string, draft: StayDraft, custom: boolean, photos: string[]): boolean {
    return this.commit(saveStay(this.state(), slug, draft, custom, photos));
  }

  reset(slug: string): void {
    this.commit(resetEdits(this.state(), slug));
  }

  remove(slug: string): void {
    this.commit(removeCustom(this.state(), slug));
  }

  /** The in-memory state only changes when the write succeeded, so UI and storage never disagree. */
  private commit(next: OwnerState): boolean {
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      this.persisted.set(false);
      return false;
    }
    this.state.set(next);
    this.persisted.set(true);
    return true;
  }
}

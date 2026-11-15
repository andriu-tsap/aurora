import { Injectable, computed, signal } from "@angular/core";
import {
  emptyOwnerState,
  ownerRows,
  parseOwnerState,
  resetEdits,
  setNightly,
  stays,
  type OwnerState,
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

  setNightly(slug: string, cents: number): boolean {
    const next = setNightly(this.state(), slug, cents);
    if (next === this.state()) return false;
    this.commit(next);
    return true;
  }

  reset(slug: string): void {
    this.commit(resetEdits(this.state(), slug));
  }

  private commit(next: OwnerState): void {
    this.state.set(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
      this.persisted.set(true);
    } catch {
      this.persisted.set(false);
    }
  }
}

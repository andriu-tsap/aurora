import { Injectable, inject, signal } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";

const KEY = "aurora-admin-session";

/** Demo sign-in: no password and no server, just a flag in sessionStorage. */
@Injectable({ providedIn: "root" })
export class Session {
  readonly signedIn = signal(this.read());

  private read(): boolean {
    try {
      return sessionStorage.getItem(KEY) === "owner";
    } catch {
      return false;
    }
  }

  signIn(): void {
    try {
      sessionStorage.setItem(KEY, "owner");
    } catch {
      /* blocked storage: stay signed in for this page view only */
    }
    this.signedIn.set(true);
  }

  signOut(): void {
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      /* nothing to clean up */
    }
    this.signedIn.set(false);
  }
}

export const authGuard: CanActivateFn = () => {
  const session = inject(Session);
  return session.signedIn() ? true : inject(Router).createUrlTree(["/login"]);
};

import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";
import type { Locale } from "@aurora/types";

import { I18n } from "./core/i18n";
import { Session } from "./core/session";

@Component({
  selector: "au-root",
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: "./app.html",
  styleUrl: "./app.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly i18n = inject(I18n);
  protected readonly session = inject(Session);
  private readonly router = inject(Router);
  /** The public site lives one level above /admin/, whatever the base path is. */
  protected readonly siteUrl = new URL("../", document.baseURI).href;

  protected setLocale(event: Event): void {
    this.i18n.locale.set((event.target as HTMLSelectElement).value as Locale);
  }

  protected signOut(): void {
    this.session.signOut();
    void this.router.navigateByUrl("/login");
  }
}

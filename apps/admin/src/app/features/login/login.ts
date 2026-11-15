import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { Router } from "@angular/router";

import { I18n } from "../../core/i18n";
import { Session } from "../../core/session";

@Component({
  selector: "au-login",
  templateUrl: "./login.html",
  styleUrl: "./login.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  protected readonly i18n = inject(I18n);
  private readonly session = inject(Session);
  private readonly router = inject(Router);

  protected signIn(): void {
    this.session.signIn();
    void this.router.navigateByUrl("/properties");
  }
}

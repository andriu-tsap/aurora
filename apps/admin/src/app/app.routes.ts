import { Routes } from "@angular/router";

import { authGuard } from "./core/session";

export const routes: Routes = [
  { path: "", pathMatch: "full", redirectTo: "properties" },
  {
    path: "login",
    title: "AURORA owner panel (demo)",
    loadComponent: () => import("./features/login/login").then((m) => m.Login),
  },
  {
    path: "properties",
    canActivate: [authGuard],
    title: "Properties — AURORA owner panel (demo)",
    loadComponent: () =>
      import("./features/properties/properties").then((m) => m.Properties),
  },
  { path: "**", redirectTo: "properties" },
];

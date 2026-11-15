/** English copy; also the type source for the other locales. */
export const en = {
  brand: "AURORA",
  panel: "Owner panel",
  demoBadge: "Demo data",
  demoNote:
    "Demo: no server. Everything you change is stored only in this browser.",
  skip: "Skip to content",
  language: "Language",
  nav: "Main",
  navProperties: "Properties",
  backToSite: "Back to the site",
  logout: "Sign out",
  loginTitle: "Owner panel",
  loginLead:
    "Manage the fictional AURORA stays: prices, photos, availability and revenue.",
  loginButton: "Sign in as demo owner",
  loginNote: "No password. Concept / demo project — fictional data.",
  propertiesTitle: "Properties",
  propertiesLead:
    "Edit nightly prices here. Changes are saved in this browser and never leave it.",
  colStay: "Stay",
  colRegion: "Region",
  colGuests: "Guests",
  colNightly: "Nightly price",
  colActions: "Actions",
  edited: "Edited",
  custom: "Added by you",
  saveFailed: "Could not save in this browser (storage is full or blocked).",
  priceLabel: "Nightly price in euro",
  savePrice: "Save",
  priceSaved: "Price saved",
  priceInvalid: "Enter a price above 0",
  resetStay: "Reset to demo",
  reset: "Reset",
  perNight: "per night",
  regionCarpathians: "Carpathians",
  regionTatras: "Tatras",
  regionAdriatic: "Adriatic",
  regionJulianAlps: "Julian Alps",
} as const;

export type Messages = { [K in keyof typeof en]: string };

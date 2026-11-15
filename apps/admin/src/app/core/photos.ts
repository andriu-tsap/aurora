import { Injectable } from "@angular/core";
import { fitWithin, MAX_PHOTO_CHARS } from "@aurora/demo-data";

export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SOURCE_BYTES = 25 * 1024 * 1024;
const SIDES = [1600, 1280, 1024, 800];
const QUALITIES = [0.82, 0.7, 0.56];

/** Browser-side compression: nothing is uploaded, the result is a small JPEG data URL. */
@Injectable({ providedIn: "root" })
export class Photos {
  async compress(file: File): Promise<string | null> {
    if (!PHOTO_TYPES.includes(file.type) || file.size > MAX_SOURCE_BYTES) return null;
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      return null;
    }
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      for (const side of SIDES) {
        const size = fitWithin(bitmap.width, bitmap.height, side);
        canvas.width = size.width;
        canvas.height = size.height;
        // JPEG has no alpha: paint a dark background so transparent PNGs stay readable.
        ctx.fillStyle = "#0e1430";
        ctx.fillRect(0, 0, size.width, size.height);
        ctx.drawImage(bitmap, 0, 0, size.width, size.height);
        for (const q of QUALITIES) {
          const url = canvas.toDataURL("image/jpeg", q);
          if (url.length <= MAX_PHOTO_CHARS) return url;
        }
      }
      return null;
    } finally {
      bitmap.close();
    }
  }
}

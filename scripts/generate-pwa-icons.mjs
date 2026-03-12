#!/usr/bin/env node
import sharp from "sharp";
import { readFileSync } from "fs";
import { mkdirSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const svgPath = join(root, "src/app/icon.svg");
const outDir = join(root, "public/icons");

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const svg = readFileSync(svgPath);

for (const size of [192, 512]) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(join(outDir, `icon-${size}.png`));
  console.log(`Generated public/icons/icon-${size}.png`);
}

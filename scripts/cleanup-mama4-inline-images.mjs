import { readFileSync, writeFileSync } from "node:fs";

const files = Array.from({ length: 6 }, (_, index) => `lib/mama4-products-${index + 1}.ts`);
const inlineImage = /,"imageUrl":"data:image\/[^"]+"/g;

let removedBytes = 0;
let changedFiles = 0;

for (const file of files) {
  const before = readFileSync(file, "utf8");
  const after = before.replace(inlineImage, "");

  if (after === before) continue;

  removedBytes += Buffer.byteLength(before) - Buffer.byteLength(after);
  changedFiles += 1;
  writeFileSync(file, after);
}

console.log(`Removed ${removedBytes} bytes of unused inline images from ${changedFiles} files.`);

if (changedFiles === 0) {
  console.log("No inline images found; nothing to clean.");
}

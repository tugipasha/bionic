// Projede emoji kalmadığını doğrular: `npm run check:emoji`
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const EXT = new Set([".ts", ".tsx", ".css", ".md", ".json", ".sql", ".html"]);
const SKIP = new Set(["node_modules", ".git", "dist", ".output", "package-lock.json", "bun.lock"]);
const EMOJI =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{FE0F}\u{200D}\u{20E3}]/u;

let bad = 0;
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (EXT.has(extname(p))) {
      readFileSync(p, "utf8")
        .split("\n")
        .forEach((line, i) => {
          if (EMOJI.test(line)) {
            bad++;
            console.error(`${p}:${i + 1}: ${line.trim().slice(0, 100)}`);
          }
        });
    }
  }
})(".");
if (bad) {
  console.error(`\n${bad} satırda emoji bulundu.`);
  process.exit(1);
}
console.log("Emoji yok.");

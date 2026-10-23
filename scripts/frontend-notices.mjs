import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const roots = execFileSync(
  "npm",
  ["ls", "--parseable", "--all", "--omit=dev"],
  { encoding: "utf8" },
)
  .trim()
  .split("\n")
  .slice(1);
let text =
  "Banking Studio frontend — installed production dependency licences\n\n";
for (const root of roots) {
  const pkg = JSON.parse(readFileSync(`${root}/package.json`));
  let license = "";
  for (const f of [
    "LICENSE",
    "LICENSE.md",
    "LICENSE.txt",
    "LICENSE-MIT",
    "LICENSE-MIT.txt",
    "license",
    "license.md",
    "OFL.txt",
  ]) {
    try {
      license = readFileSync(`${root}/${f}`, "utf8");
      break;
    } catch {}
  }
  if (!license) throw new Error(`Missing licence for ${pkg.name}`);
  text += `\n${pkg.name} ${pkg.version} (${pkg.license})\n${license}\n`;
}
writeFileSync("public/react/third-party-notices.txt", text);
console.log(
  `Preserved licence texts for ${roots.length} production dependency packages.`,
);

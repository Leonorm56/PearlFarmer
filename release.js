import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const [major, minor, patch] = pkg.version.split(".").map(Number);
pkg.version = `${major}.${minor}.${patch + 1}`;
writeFileSync("package.json", JSON.stringify(pkg, null, 2));

const extPkg = JSON.parse(readFileSync("apps/purrfect-farmer/package.json", "utf8"));
extPkg.version = pkg.version;
writeFileSync("apps/purrfect-farmer/package.json", JSON.stringify(extPkg, null, 2));

const version = pkg.version;

execSync("pnpm build:farmer", { stdio: "inherit" });

execSync(`cd apps/purrfect-farmer/dist-bundle && ren "purrfect-farmer-v${version}.zip" "nilechain-v${version}.zip" && ren "purrfect-farmer-v${version}.crx" "nilechain-v${version}.crx"`, { shell: "cmd" });

execSync("git add -A");
execSync(`git commit -m "Release v${version}"`);
execSync("git push origin main");

execSync(`gh release create v${version} "apps/purrfect-farmer/dist-bundle/nilechain-v${version}.zip" "apps/purrfect-farmer/dist-bundle/nilechain-v${version}.crx" --title "NileChain v${version}" --notes "NileChain v${version}" --repo Leonorm56/NileChain`);

console.log("Released v" + version);
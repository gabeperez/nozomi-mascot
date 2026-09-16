import { mkdir, readFile, writeFile, cp, rm } from "node:fs/promises";
import { join } from "node:path";
const root = process.cwd(),
  out = join(root, "walrus-home"),
  cfg = "/Users/gabe/.config/nozomi-mascot/testnet";
// Rebuild only public home artifacts; never upload the repository or wallet files.
const build = Bun.spawnSync(["bun", "run", "build"], {
  stdout: "inherit",
  stderr: "inherit",
});
if (build.exitCode) throw Error("Build failed");
let resources: string;
try {
  resources = await readFile(join(out, "ws-resources.json"), "utf8");
} catch {
  const deployed = JSON.parse(
    await readFile("deployments/walrus-home-testnet.json", "utf8"),
  );
  resources = JSON.stringify({
    site_name: "Nozomi Companion Homes",
    object_id: deployed.siteObject,
  });
}
await mkdir(out, { recursive: true });
await rm(join(out, "assets"), { recursive: true, force: true });
await cp("dist/assets", join(out, "assets"), { recursive: true });
await cp("dist/home/index.html", join(out, "index.html"));
await mkdir(join(out, "mascots"), { recursive: true });
for (const file of ["nozomi-directions.webp", "nozomi-reactions.webp"])
  await cp("public/mascots/" + file, join(out, "mascots", file));
await writeFile(join(out, "ws-resources.json"), resources);
const args = [
  "/Users/gabe/.local/bin/nozomi-site-builder",
  "--config",
  cfg + "/sites-config.yaml",
  "--context",
  "testnet",
  "--wallet",
  cfg + "/client.yaml",
  "--wallet-env",
  "testnet",
  "--walrus-binary",
  "/Users/gabe/.local/bin/nozomi-walrus",
  "--walrus-config",
  cfg + "/walrus.yaml",
  "--walrus-context",
  "testnet",
  "deploy",
  "--epochs",
  "30",
  out,
];
const result = Bun.spawn(args, { stdout: "pipe", stderr: "pipe" });
const [stdout, stderr] = await Promise.all([
  new Response(result.stdout).text(),
  new Response(result.stderr).text(),
]);
await writeFile("/tmp/nozomi-home-update.log", stdout + "\n" + stderr);
if (await result.exited)
  throw Error("Walrus update failed. See /tmp/nozomi-home-update.log");
const manifest = Bun.spawnSync(
  ["python3", "scripts/walrus-manifest.py", "/tmp/nozomi-home-update.log"],
  { stdout: "inherit", stderr: "inherit" },
);
if (manifest.exitCode)
  throw Error("Manifest verification failed; portal was not changed.");
const portal = Bun.spawnSync(
  ["bunx", "wrangler", "deploy", "--config", "worker/home-portal.jsonc"],
  { stdout: "inherit", stderr: "inherit" },
);
if (portal.exitCode) throw Error("Portal deployment failed.");
console.log(
  "Walrus home and public portal updated. Commit the updated deployment manifest.",
);

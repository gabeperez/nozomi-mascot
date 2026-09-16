import { readFile, writeFile } from "node:fs/promises";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import { client, guard, PACKAGE } from "../test/config";
await guard();
const build = JSON.parse(
  await readFile("/tmp/nozomi-upgrade-build.json", "utf8"),
);
const signer = Ed25519Keypair.fromSecretKey(
  (
    await readFile(
      "/Users/gabe/.config/nozomi-mascot/testnet/wallet.key",
      "utf8",
    )
  ).trim(),
);
const tx = new Transaction(),
  cap = tx.object(
    "0xc829f5928e68424d78338cdce55c0e98c2414ae91abee6ba624937afb19a2b98",
  );
const ticket = tx.moveCall({
  target: "0x2::package::authorize_upgrade",
  arguments: [cap, tx.pure.u8(0), tx.pure.vector("u8", build.digest)],
});
const receipt = tx.upgrade({
  modules: build.modules,
  dependencies: build.dependencies,
  package: PACKAGE,
  ticket,
});
tx.moveCall({
  target: "0x2::package::commit_upgrade",
  arguments: [cap, receipt],
});
const result = await client.signAndExecuteTransaction({
  transaction: tx,
  signer,
  include: { effects: true },
});
if (result.FailedTransaction)
  throw Error(JSON.stringify(result.FailedTransaction.status));
await client.waitForTransaction({ digest: result.Transaction!.digest });
await writeFile(
  "/tmp/nozomi-upgrade-result.json",
  JSON.stringify(result, null, 2),
);
console.log(result.Transaction!.digest);

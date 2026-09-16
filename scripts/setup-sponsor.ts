import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { readFile, writeFile } from "node:fs/promises";
import { Transaction } from "@mysten/sui/transactions";
import { client, guard } from "../test/config";
await guard();
const file = "/Users/gabe/.config/nozomi-mascot/testnet/sponsor.key";
let sponsor: Ed25519Keypair;
try {
  sponsor = Ed25519Keypair.fromSecretKey((await readFile(file, "utf8")).trim());
} catch (e: any) {
  if (e.code !== "ENOENT") throw e;
  sponsor = Ed25519Keypair.generate();
  await writeFile(file, sponsor.getSecretKey(), { mode: 0o600, flag: "wx" });
}
const owner = Ed25519Keypair.fromSecretKey(
  (
    await readFile(
      "/Users/gabe/.config/nozomi-mascot/testnet/wallet.key",
      "utf8",
    )
  ).trim(),
);
const balance = await client.getBalance({ owner: sponsor.toSuiAddress() });
if (BigInt(balance.balance.balance) < 100000000n) {
  const tx = new Transaction();
  const [coin] = tx.splitCoins(tx.gas, [250000000]);
  tx.transferObjects([coin], sponsor.toSuiAddress());
  const r = await client.signAndExecuteTransaction({
    transaction: tx,
    signer: owner,
  });
  if (r.FailedTransaction) throw Error("Funding failed");
  console.log("Funding receipt:", r.Transaction!.digest);
}
console.log("Test sponsor:", sponsor.toSuiAddress());

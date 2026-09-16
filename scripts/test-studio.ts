import { readFile, writeFile } from "node:fs/promises";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import {
  client,
  guard,
  PACKAGE,
  STUDIO,
  TYPE,
  parseCharacter,
} from "../test/config";
await guard();
const key = Ed25519Keypair.fromSecretKey(
  (
    await readFile(
      "/Users/gabe/.config/nozomi-mascot/testnet/wallet.key",
      "utf8",
    )
  ).trim(),
);
const owner = key.toSuiAddress();
async function send(tx: Transaction) {
  const result = await client.signAndExecuteTransaction({
    transaction: tx,
    signer: key,
  });
  if (result.FailedTransaction)
    throw Error(JSON.stringify(result.FailedTransaction.status));
  const digest = result.Transaction!.digest;
  await client.waitForTransaction({ digest });
  return digest;
}
let { objects } = await client.listOwnedObjects({
  owner,
  type: TYPE,
  include: { json: true },
});
let claimDigest: string | undefined, unlockDigest: string | undefined;
if (!objects.length) {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE}::studio::claim`,
    arguments: [tx.object(STUDIO)],
  });
  claimDigest = await send(tx);
  ({ objects } = await client.listOwnedObjects({
    owner,
    type: TYPE,
    include: { json: true },
  }));
}
let character = parseCharacter(objects[0]!);
if (!character.unlocked) {
  const tx = new Transaction();
  const [payment] = tx.splitCoins(tx.gas, [10000000]);
  tx.moveCall({
    target: `${PACKAGE}::studio::unlock`,
    arguments: [
      tx.object(STUDIO),
      tx.object(character.id),
      tx.pure.string("Mochi"),
      tx.pure.u8(3),
      payment,
    ],
  });
  unlockDigest = await send(tx);
}
character = parseCharacter(
  (await client.getObject({ objectId: character.id, include: { json: true } }))
    .object,
);
if (
  !character.unlocked ||
  character.name !== "Mochi" ||
  character.palette !== 3
)
  throw Error("Saved character did not match");
const record = {
  network: "testnet",
  package: PACKAGE,
  studio: STUDIO,
  character,
  claimDigest,
  unlockDigest,
  verifiedAt: new Date().toISOString(),
};
await writeFile(
  "deployments/studio-testnet.json",
  JSON.stringify(record, null, 2) + "\n",
);
console.log(JSON.stringify(record, null, 2));

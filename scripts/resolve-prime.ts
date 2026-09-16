import {
  mainnet,
  mainnetGuard,
  PRIME_PACKAGE,
} from "../server/prime-ownership";
import { bcs } from "@mysten/sui/bcs";
import { writeFile, mkdir } from "node:fs/promises";
await mainnetGuard();
const number = Number(process.argv[2] || 1541);
if (!Number.isInteger(number) || number < 0 || number > 65535)
  throw Error("Invalid collection number");
const dir = `characters/prime-${number}`;
const registry = await mainnet.getObject({
  objectId:
    "0x4616b6c78b2ce8b9143d01a1876b7fec014e80ae16e1ee1577e9c1df1ea3ddf3",
  include: { json: true },
});
if (
  registry.object.type !== `${PRIME_PACKAGE}::registry::Registry` ||
  !registry.object.json?.is_frozen
)
  throw Error("Unverified registry");
const field = await mainnet.getDynamicField({
  parentId: (registry.object.json as any).pfps.id,
  name: { type: "u16", bcs: bcs.u16().serialize(number).toBytes() },
});
const objectId = bcs.Address.parse(field.dynamicField.value.bcs);
const { object } = await mainnet.getObject({
  objectId,
  include: { json: true, owner: true },
});
await mkdir(dir, { recursive: true });
await writeFile(`${dir}/source.json`, JSON.stringify(object, null, 2));
console.log(`Resolved #${number}: ${objectId}`);

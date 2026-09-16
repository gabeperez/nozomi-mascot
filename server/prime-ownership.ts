import { SuiGrpcClient } from "@mysten/sui/grpc";
import { kiosk } from "@mysten/kiosk";
import { normalizeStructTag } from "@mysten/sui/utils";
export const PRIME_PACKAGE =
  "0x034c162f6b594cb5a1805264dd01ca5d80ce3eca6522e6ee37fd9ebfb9d3ddca";
export const PRIME_TYPE = `${PRIME_PACKAGE}::factory::PrimeMachin`;
export const mainnet = new SuiGrpcClient({
  network: "mainnet",
  baseUrl: "https://fullnode.mainnet.sui.io:443",
}).$extend(kiosk());
export type PrimeSource = {
  objectId: string;
  number: number;
  version: string;
  imageUrl: string;
  image: unknown;
  attributes: unknown;
  holding: "direct" | "kiosk";
  kioskId?: string;
};
export function validAddress(a: unknown): a is string {
  return typeof a === "string" && /^0x[0-9a-fA-F]{64}$/.test(a);
}
export function exactPrime(type: string) {
  return normalizeStructTag(type) === normalizeStructTag(PRIME_TYPE);
}
export async function mainnetGuard(rpc = mainnet) {
  const { response } = await rpc.ledgerService.getServiceInfo({});
  if (response.chainId !== "4btiuiMPvEENsttpZC7CZ53DruC3MAgfznDbASZ7DR6S")
    throw Error("Original collection network could not be verified.");
}
export async function ownedKiosks(owner: string, rpc = mainnet) {
  let cursor: string | undefined;
  const ids: string[] = [];
  do {
    const r = await rpc.kiosk.getOwnedKiosks({
      address: owner,
      pagination: { cursor, limit: 50 },
    });
    ids.push(...r.kioskIds);
    cursor = r.hasNextPage ? r.nextCursor || undefined : undefined;
  } while (cursor);
  return [...new Set(ids)];
}
function source(
  o: any,
  holding: "direct" | "kiosk",
  kioskId?: string,
): PrimeSource {
  if (
    !exactPrime(o.type) ||
    !o.json ||
    !Number.isInteger(Number(o.json.number))
  )
    throw Error("This is not an original Prime Machin.");
  return {
    objectId: o.objectId,
    number: Number(o.json.number),
    version: o.version,
    imageUrl: `https://img.sm.xyz/${o.objectId}/`,
    image: o.json.image,
    attributes: o.json.attributes,
    holding,
    kioskId,
  };
}
export async function listPrime(owner: string) {
  if (!validAddress(owner)) throw Error("Invalid wallet address.");
  await mainnetGuard();
  const found = new Map<string, PrimeSource>();
  let cursor: string | null | undefined;
  do {
    const r = await mainnet.listOwnedObjects({
      owner,
      type: PRIME_TYPE,
      include: { json: true, owner: true },
      cursor,
    });
    for (const o of r.objects)
      if (o.owner.AddressOwner === owner)
        found.set(o.objectId, source(o, "direct"));
    cursor = r.hasNextPage ? r.cursor : null;
  } while (cursor);
  for (const id of await ownedKiosks(owner)) {
    const data = await mainnet.kiosk.getKiosk({ id });
    for (let i = 0; i < data.itemIds.length; i += 50) {
      const { objects } = await mainnet.getObjects({
        objectIds: data.itemIds.slice(i, i + 50),
        include: { json: true },
      });
      for (const o of objects)
        if (!(o instanceof Error) && exactPrime(o.type))
          found.set(o.objectId, source(o, "kiosk", id));
    }
  }
  return [...found.values()].sort((a, b) => a.number - b.number);
}
export async function verifyPrime(
  owner: string,
  objectId: string,
  rpc = mainnet,
) {
  if (!validAddress(owner) || !validAddress(objectId))
    throw Error("Invalid owner or NFT ID.");
  await mainnetGuard(rpc);
  const { object } = await rpc.getObject({
    objectId,
    include: { json: true, owner: true },
  });
  if (!exactPrime(object.type))
    throw Error("Object is not from the original Prime Machin contract.");
  if (object.owner.AddressOwner === owner) return source(object, "direct");
  // Membership plus a currently held standard/personal owner capability proves kiosk control.
  // Never use PrimeMachin.kiosk_id: that is the NFT's own accessory kiosk.
  for (const id of await ownedKiosks(owner, rpc)) {
    const data = await rpc.kiosk.getKiosk({ id });
    if (data.itemIds.includes(objectId)) return source(object, "kiosk", id);
  }
  throw Error(
    "This wallet does not currently hold that Prime Machin. Transfer or sale invalidates access.",
  );
}

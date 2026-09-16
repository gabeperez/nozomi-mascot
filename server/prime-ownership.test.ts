import { test, expect } from "bun:test";
import { verifyPrime, PRIME_TYPE } from "./prime-ownership";
const alice = "0x" + "a".repeat(64),
  bob = "0x" + "b".repeat(64),
  nft = "0x" + "c".repeat(64),
  kioskId = "0x" + "d".repeat(64);
function rpc({
  type = PRIME_TYPE,
  owner = alice,
  heldKiosks = [] as string[],
  contents = [] as string[],
} = {}) {
  return {
    ledgerService: {
      getServiceInfo: async () => ({
        response: { chainId: "4btiuiMPvEENsttpZC7CZ53DruC3MAgfznDbASZ7DR6S" },
      }),
    },
    getObject: async () => ({
      object: {
        type,
        objectId: nft,
        version: "7",
        owner: { AddressOwner: owner },
        json: {
          number: 42,
          kiosk_id: kioskId,
          image: { id: "original-image" },
          attributes: [],
        },
      },
    }),
    kiosk: {
      getOwnedKiosks: async () => ({
        kioskIds: heldKiosks,
        hasNextPage: false,
      }),
      getKiosk: async () => ({ itemIds: contents }),
    },
  } as any;
}
test("direct holder gets the chain number/image, never a supplied replacement", async () => {
  const s = await verifyPrime(alice, nft, rpc());
  expect(s.number).toBe(42);
  expect(s.imageUrl).toBe(`https://img.sm.xyz/${nft}/`);
  expect(s.holding).toBe("direct");
});
test("same type name in a counterfeit package does not qualify", async () => {
  await expect(
    verifyPrime(alice, nft, rpc({ type: "0x123::factory::PrimeMachin" })),
  ).rejects.toThrow("original Prime Machin");
});
test("an NFT accessory kiosk field does not prove wallet ownership", async () => {
  await expect(verifyPrime(alice, nft, rpc({ owner: bob }))).rejects.toThrow(
    "does not currently hold",
  );
});
test("current capability plus kiosk membership qualifies", async () => {
  const s = await verifyPrime(
    alice,
    nft,
    rpc({ owner: bob, heldKiosks: [kioskId], contents: [nft] }),
  );
  expect(s.holding).toBe("kiosk");
});
test("a transferred NFT invalidates the previous holder", async () => {
  await expect(
    verifyPrime(
      alice,
      nft,
      rpc({ owner: bob, heldKiosks: [kioskId], contents: [] }),
    ),
  ).rejects.toThrow("does not currently hold");
});

import { verifyPrime, validAddress, mainnet } from "../server/prime-ownership";
import { verifyPersonalMessageSignature } from "@mysten/sui/verify";
import type {
  DurableObjectState,
  DurableObjectNamespace,
} from "@cloudflare/workers-types";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { parseSerializedSignature } from "@mysten/sui/cryptography";
import { verifyTransactionSignature } from "@mysten/sui/verify";
import { Transaction } from "@mysten/sui/transactions";
import { fromBase64, toBase64 } from "@mysten/sui/utils";
import { client, guard, PACKAGE, STUDIO } from "../test/config";
interface Env {
  SPONSOR: DurableObjectNamespace;
  SPONSOR_KEY: string;
}
type Pending = {
  bytes: string;
  sender: string;
  expires: number;
  digest?: string;
};
const origins = [
  "https://gabeperez.github.io",
  "http://127.0.0.1:5178",
  "http://localhost:5178",
];
export default {
  async fetch(req: Request, env: Env) {
    const origin = req.headers.get("origin") || "";
    const headers = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      Vary: "Origin",
      "Cache-Control": "no-store",
    };
    if (!origins.includes(origin))
      return new Response("Origin not allowed", { status: 403 });
    if (req.method === "OPTIONS") return new Response(null, { headers });
    if (req.method !== "POST")
      return new Response("POST required", { status: 405, headers });
    if (Number(req.headers.get("content-length") || 0) > 16000)
      return new Response("Too large", { status: 413, headers });
    const text = await req.text();
    if (text.length > 16000)
      return new Response("Too large", { status: 413, headers });
    const stub = env.SPONSOR.get(env.SPONSOR.idFromName("testnet-budget-v1"));
    const inner = await stub.fetch(
      new Request(req.url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-client-ip": req.headers.get("CF-Connecting-IP") || "unknown",
        },
        body: text,
      }) as any,
    );
    return new Response(inner.body as any, {
      status: inner.status,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  },
};
export class Sponsor {
  constructor(
    private ctx: DurableObjectState,
    private env: Env,
  ) {}
  async fetch(req: Request) {
    return this.ctx.blockConcurrencyWhile(async () => {
      try {
        return await this.handle(req);
      } catch (e) {
        return Response.json(
          { error: e instanceof Error ? e.message : "Please try again." },
          { status: 400 },
        );
      }
    });
  }
  async handle(req: Request) {
    const b = (await req.json()) as any;
    const route = new URL(req.url).pathname;
    const store = this.ctx.storage;
    // Legacy sample mints are deliberately closed. A verified original and
    // matching, reviewed asset pair are prerequisites for the replacement mint.
    if (route === "/prepare" || route === "/execute")
      return Response.json(
        {
          error:
            "Original Prime Machin ownership and matching artwork are required. The sample mint is closed.",
        },
        { status: 409 },
      );
    if (route === "/ownership/challenge") {
      if (!validAddress(b.owner) || !validAddress(b.objectId))
        throw Error("Select an original Prime Machin.");
      const day = new Date().toISOString().slice(0, 10),
        rateKey =
          "ownership-rate:" + day + ":" + req.headers.get("x-client-ip");
      const attempts = (await store.get<number>(rateKey)) || 0;
      if (attempts >= 30) throw Error("Too many verification attempts today.");
      await store.put(rateKey, attempts + 1);
      const source = await verifyPrime(b.owner, b.objectId);
      const id = crypto.randomUUID(),
        expires = Date.now() + 300000;
      const message = [
        "Nozomi — verify my Prime Machin",
        "Site: https://gabeperez.github.io/nozomi-mascot/test/",
        "Network: Sui mainnet (read-only)",
        "Wallet: " + b.owner,
        "Original NFT: " + b.objectId,
        "Prime Machin #" + source.number,
        "Purpose: verify ownership and save this NFT as the source for avatar and full-body artwork.",
        "This does not transfer NFTs, spend funds, or authorize future transactions.",
        "Expires: " + new Date(expires).toISOString(),
        "Nonce: " + id,
      ].join("\n");
      await store.put("ownership-challenge:" + id, {
        owner: b.owner,
        objectId: b.objectId,
        message,
        expires,
      });
      return Response.json({ id, message, source });
    }
    if (route === "/ownership/verify") {
      if (
        typeof b.id !== "string" ||
        typeof b.signature !== "string" ||
        b.signature.length > 12000
      )
        throw Error("Invalid verification.");
      const record = await store.get<{
        owner: string;
        objectId: string;
        message: string;
        expires: number;
      }>("ownership-challenge:" + b.id);
      if (!record || record.expires < Date.now())
        throw Error("Verification expired. Please try again.");
      await verifyPersonalMessageSignature(
        new TextEncoder().encode(record.message),
        b.signature,
        { address: record.owner, client: mainnet },
      );
      const source = await verifyPrime(record.owner, record.objectId);
      await store.delete("ownership-challenge:" + b.id);
      // Source metadata comes only from the canonical chain read, never the request.
      const receipt = {
        owner: record.owner,
        source,
        verifiedAt: new Date().toISOString(),
        status: "awaiting_artwork",
        avatar: null,
        fullBody: null,
      };
      await store.put("render-source:" + source.objectId, receipt);
      return Response.json(receipt);
    }
    const signer = Ed25519Keypair.fromSecretKey(this.env.SPONSOR_KEY.trim());
    await guard();
    if (route === "/prepare") {
      if (
        !/^0x[0-9a-f]{64}$/.test(b.sender) ||
        typeof b.name !== "string" ||
        !b.name.trim() ||
        new TextEncoder().encode(b.name.trim()).length > 40 ||
        !Number.isInteger(b.palette) ||
        b.palette < 0 ||
        b.palette > 3
      )
        throw Error("Check your name and backdrop.");
      const day = new Date().toISOString().slice(0, 10),
        key = "attempt:" + day + ":" + req.headers.get("x-client-ip");
      const n = (await store.get<number>(key)) || 0;
      if (n >= 20) throw Error("Too many attempts. Please try tomorrow.");
      await store.put(key, n + 1);
      const total = (await store.get<number>("total")) || 0;
      if (total >= 30)
        throw Error("The test invitation budget has been used up.");
      const today = (await store.get<number>("paid:" + day)) || 0;
      if (today >= 10)
        throw Error(
          "Today’s free test invitations are used up. Please come back tomorrow.",
        );
      if (await store.get("used:" + b.sender))
        throw Error("Your companion was already created. Refresh to find it.");
      const tx = new Transaction();
      tx.setSender(b.sender);
      tx.setGasOwner(signer.toSuiAddress());
      tx.setGasBudget(15000000);
      const [payment] = tx.splitCoins(tx.gas, [10000000]);
      tx.moveCall({
        target: `${PACKAGE}::studio::create`,
        arguments: [
          tx.object(STUDIO),
          tx.pure.string(b.name.trim()),
          tx.pure.u8(b.palette),
          payment,
        ],
      });
      const bytes = toBase64(await tx.build({ client }));
      const id = crypto.randomUUID();
      await store.put("pending:" + id, {
        bytes,
        sender: b.sender,
        expires: Date.now() + 120000,
      } satisfies Pending);
      await store.setAlarm(Date.now() + 180000);
      return Response.json({ id, bytes, expiresIn: 120 });
    }
    if (route === "/execute") {
      if (
        typeof b.id !== "string" ||
        typeof b.signature !== "string" ||
        b.signature.length > 6000
      )
        throw Error("Invalid confirmation.");
      const p = await store.get<Pending>("pending:" + b.id);
      if (!p) throw Error("Confirmation expired. Please try again.");
      if (p.digest) return Response.json({ digest: p.digest });
      if (p.expires < Date.now())
        throw Error("Confirmation expired. Please try again.");
      if (parseSerializedSignature(b.signature).signatureScheme !== "Passkey")
        throw Error("Please confirm using your passkey.");
      const bytes = fromBase64(p.bytes);
      await verifyTransactionSignature(bytes, b.signature, {
        address: p.sender,
      });
      if (await store.get("used:" + p.sender))
        throw Error("Already created. Refresh to find your companion.");
      const day = new Date().toISOString().slice(0, 10),
        total = (await store.get<number>("total")) || 0,
        today = (await store.get<number>("paid:" + day)) || 0;
      if (total >= 30 || today >= 10)
        throw Error("The free test budget is full. Please try later.");
      // Count attempts before signing: uncertain network replies cannot exceed the spending cap.
      await store.put({ total: total + 1, ["paid:" + day]: today + 1 });
      const sponsor = await signer.signTransaction(bytes);
      const result = await client.executeTransaction({
        transaction: bytes,
        signatures: [b.signature, sponsor.signature],
      });
      if (result.FailedTransaction)
        throw Error(
          "The confirmation didn’t complete. Refresh, then try again.",
        );
      p.digest = result.Transaction!.digest;
      await store.put({
        ["pending:" + b.id]: p,
        ["used:" + p.sender]: p.digest,
      });
      return Response.json({ digest: p.digest });
    }
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  async alarm() {
    const pending = await this.ctx.storage.list<Pending>({
      prefix: "pending:",
    });
    for (const [k, p] of pending)
      if (p.expires < Date.now() - 3600000) await this.ctx.storage.delete(k);
    if (pending.size) await this.ctx.storage.setAlarm(Date.now() + 3600000);
  }
}

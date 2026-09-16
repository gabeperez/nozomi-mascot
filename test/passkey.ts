import {
  BrowserPasskeyProvider,
  PasskeyKeypair,
  findCommonPublicKey,
} from "@mysten/sui/keypairs/passkey";
import { fromBase64, toBase64 } from "@mysten/sui/utils";
const KEY = "nozomi-passkey-public-v1";
function provider() {
  return new BrowserPasskeyProvider("Nozomi companion", {
    rp: { id: location.hostname, name: "Nozomi" },
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      residentKey: "required",
      userVerification: "required",
    },
  });
}
function remember(signer: PasskeyKeypair) {
  localStorage.setItem(
    KEY,
    JSON.stringify({
      publicKey: toBase64(signer.getPublicKey().toRawBytes()),
      credentialId: signer.getCredentialId()
        ? toBase64(signer.getCredentialId()!)
        : undefined,
    }),
  );
  return signer;
}
export function cachedPasskey() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "null");
    return s
      ? new PasskeyKeypair(
          fromBase64(s.publicKey),
          provider(),
          s.credentialId ? fromBase64(s.credentialId) : undefined,
        )
      : null;
  } catch {
    return null;
  }
}
export async function createPasskey() {
  if (!window.PublicKeyCredential)
    throw Error(
      "This browser doesn’t support passkeys. Try Safari or Chrome on your own device.",
    );
  return remember(await PasskeyKeypair.getPasskeyInstance(provider()));
}
export async function recoverPasskey() {
  const cached = cachedPasskey();
  if (cached) {
    await cached.signPersonalMessage(
      crypto.getRandomValues(new Uint8Array(32)),
    );
    return cached;
  }
  const p = provider();
  const a = await PasskeyKeypair.signAndRecover(
    p,
    crypto.getRandomValues(new Uint8Array(32)),
  );
  const b = await PasskeyKeypair.signAndRecover(
    p,
    crypto.getRandomValues(new Uint8Array(32)),
  );
  return remember(
    new PasskeyKeypair(findCommonPublicKey(a, b).toRawBytes(), p),
  );
}
const API = "https://nozomi-testnet-sponsor.perez-jg22.workers.dev";
export async function confirmCompanion(
  signer: PasskeyKeypair,
  name: string,
  palette: number,
  onSigned: () => void,
) {
  async function post(path: string, body: unknown) {
    const r = await fetch(API + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await r.json();
    if (!r.ok) throw Error(j.error || "Please try again.");
    return j;
  }
  const prepared = await post("/prepare", {
    sender: signer.toSuiAddress(),
    name,
    palette,
  });
  const signed = await signer.signTransaction(fromBase64(prepared.bytes));
  onSigned();
  return post("/execute", {
    id: prepared.id,
    signature: signed.signature,
  }) as Promise<{ digest: string }>;
}

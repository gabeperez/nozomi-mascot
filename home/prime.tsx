import { useState } from "react";
import manifest from "../public/mascots/prime-1541/manifest.json";
const base = "../mascots/prime-1541/";
export function PrimeHome() {
  const [look, setLook] = useState<"full-body" | "avatar" | "original">(
    "full-body",
  );
  const [quiet, setQuiet] = useState(false),
    [hello, setHello] = useState(false);
  return (
    <main className={`prime-home ${quiet ? "quiet" : ""}`}>
      <header>
        <a href="https://gabeperez.github.io/nozomi-mascot/test/">
          nozomi<span>a little place to belong</span>
        </a>
        <span className="status">
          <i />
          Artwork preview · #1541
        </span>
      </header>
      <section className="prime-room">
        <div className="prime-copy">
          <p className="eyebrow">A FAMILIAR FACE. A WHOLE NEW WORLD.</p>
          <h1>
            A little more
            <br />
            Machin.
          </h1>
          <p>
            The same kitsune mask. The same ice-cream hat.
            <br />
            Now with somewhere to go.
          </p>
          <div className="actions" aria-label="Choose artwork">
            {(["full-body", "avatar", "original"] as const).map((v) => (
              <button
                key={v}
                aria-pressed={look === v}
                onClick={() => setLook(v)}
              >
                {v === "full-body"
                  ? "Full body"
                  : v === "avatar"
                    ? "Profile"
                    : "Original NFT"}
              </button>
            ))}
          </div>
          <p className="greeting" role="status">
            {hello
              ? "Hey, you. I saved you a little sunshine."
              : "Prime Machin #1541’s first little hello."}
          </p>
          <div className="actions">
            <button onClick={() => setHello(!hello)}>♡ Say hello</button>
            <button onClick={() => setQuiet(!quiet)}>
              {quiet ? "☀ Morning light" : "☾ Evening light"}
            </button>
          </div>
          <p className="note">
            A public preview of our companion interpretation.
            <br />
            Only the holder of the original NFT can verify ownership.
            <br />
            Care and memories are still to come.
          </p>
          <a href="https://gabeperez.github.io/nozomi-mascot/test/">
            Verify your Machin →
          </a>
        </div>
        <div className={`prime-art ${hello ? "hello" : ""}`}>
          <img
            key={look}
            src={base + look + ".webp"}
            alt={
              look === "original"
                ? "Original on-chain artwork for Prime Machin #1541"
                : `Prime Machin #1541 ${look} companion interpretation`
            }
          />
          <span>
            {look === "original"
              ? "RECOVERED FROM SUI · HASH VERIFIED"
              : "COMPANION INTERPRETATION · FIRST EDITION"}
          </span>
        </div>
      </section>
      <footer>
        <div>
          <span>ORIGINAL MACHIN PASSPORT</span>
          <a
            href={`https://suiscan.xyz/mainnet/object/${manifest.originalObjectId}`}
            target="_blank"
            rel="noreferrer"
          >
            Prime Machin #1541 · view original ↗
          </a>
        </div>
        <p>
          Original image reconstructed from eight verified on-chain chunks.
          <br />
          Profile and full body reference the same original NFT.
          <br />
          These illustrations are interpretations, not official full-body
          models.
        </p>
        <a href={base + "manifest.json"}>Artwork provenance ↗</a>
      </footer>
    </main>
  );
}

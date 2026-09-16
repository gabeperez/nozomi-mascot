import { useEffect, useRef, useState } from "react";
import { useCurrentAccount, useDAppKit } from "@mysten/dapp-kit-react";
import { ConnectButton } from "@mysten/dapp-kit-react/ui";
import { listPrime, type PrimeSource } from "../server/prime-ownership";
const API = "https://nozomi-testnet-sponsor.perez-jg22.workers.dev";
export function OwnershipStudio() {
  const account = useCurrentAccount(),
    kit = useDAppKit();
  const [items, setItems] = useState<PrimeSource[]>([]),
    [selected, setSelected] = useState(""),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [verified, setVerified] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const generation = useRef(0);
  const nft = items.find((x) => x.objectId === selected);
  useEffect(() => {
    const turn = ++generation.current;
    setItems([]);
    setSelected("");
    setVerified(false);
    setError("");
    setMessage("");
    if (!account) {
      setLoading(false);
      return;
    }
    setLoading(true);
    listPrime(account.address)
      .then((data) => {
        if (generation.current !== turn) return;
        setItems(data);
        setSelected(data[0]?.objectId || "");
      })
      .catch(() => {
        if (generation.current === turn)
          setError(
            "We couldn’t read your holdings. Please reconnect or refresh. Nothing has been verified.",
          );
      })
      .finally(() => {
        if (generation.current === turn) setLoading(false);
      });
  }, [account?.address]);
  async function verify() {
    if (!account || !nft || busy) return;
    const turn = generation.current;
    setBusy(true);
    setError("");
    try {
      async function post(path: string, body: unknown) {
        const r = await fetch(API + path, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await r.json();
        if (!r.ok) throw Error(data.error || "Verification failed.");
        return data;
      }
      const challenge = await post("/ownership/challenge", {
        owner: account.address,
        objectId: nft.objectId,
      });
      if (turn !== generation.current) return;
      setMessage(challenge.message);
      const signed = await kit.signPersonalMessage({
        message: new TextEncoder().encode(challenge.message),
        network: "mainnet",
      });
      await post("/ownership/verify", {
        id: challenge.id,
        signature: signed.signature,
      });
      if (turn === generation.current) setVerified(true);
    } catch (e) {
      if (turn === generation.current)
        setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main>
      <header>
        <a className="brand" href="../">
          nozomi<span>your Machin, brought to life</span>
        </a>
        <div className="header-right">
          <span className="test-pill">Original NFT required</span>
          <ConnectButton />
        </div>
      </header>
      <div className="intro">
        <p className="eyebrow">ONE MACHIN. TWO WAYS TO BE YOU.</p>
        <h1>
          Your face.
          <br />
          <em>Your little friend.</em>
        </h1>
        <p>
          A profile avatar and a full-body companion,
          <br />
          both made from the Prime Machin you actually own.
        </p>
      </div>
      <section className="studio">
        <div className="preview">
          <span className="preview-label">
            {nft ? "YOUR ORIGINAL ARTWORK" : "START WITH YOUR MACHIN"}
          </span>
          {nft ? (
            <>
              <img
                className="original-machin"
                src={nft.imageUrl}
                alt={`Original Prime Machin #${nft.number}`}
                onError={(e) => {
                  e.currentTarget.alt =
                    "Original artwork preview unavailable; identity verification still uses Sui.";
                }}
              />
              <div className="nameplate">
                Prime Machin #{nft.number}
                <span>
                  {nft.holding === "kiosk"
                    ? "Held in your kiosk"
                    : "Held in your wallet"}
                </span>
              </div>
            </>
          ) : (
            <div className="nameplate">
              <img
                className="original-machin"
                src="../mascots/prime-1541/full-body.webp"
                alt="Prime Machin #1541 full-body interpretation preview"
              />
              #1541’s first little hello.
              <span>Public artwork preview · ownership not verified</span>
              <a href="https://nozomi-homes.perez-jg22.workers.dev/?prime=1541">
                Visit the full-body preview →
              </a>
            </div>
          )}
          <span className="sample">
            Original collection on Sui · source-specific companions
          </span>
        </div>
        <div className="controls">
          <nav>
            <span className={!verified ? "active" : ""}>
              1 / Verify your Machin
            </span>
            <span className={verified ? "active" : ""}>
              2 / Prepare its two looks
            </span>
          </nav>
          {!account ? (
            <>
              <h2>
                Bring your
                <br />
                Machin home.
              </h2>
              <p>
                Connect the wallet that holds your original Prime Machin. We
                check the actual collection contract, including standard and
                personal kiosks.
              </p>
              <ConnectButton />
              <p className="small">
                A passkey alone does not prove ownership of an NFT in another
                wallet. Your wallet stays the source of ownership.
              </p>
            </>
          ) : loading ? (
            <h2>Finding your Machin…</h2>
          ) : !nft ? (
            <>
              <h2>
                No Prime Machin
                <br />
                found here.
              </h2>
              <p>
                Connect the wallet holding your original NFT. Copies, test
                characters, and other collections don’t qualify.
              </p>
            </>
          ) : verified ? (
            <>
              <p className="eyebrow">OWNERSHIP VERIFIED</p>
              <h2>
                #{nft.number} is
                <br />
                our starting point.
              </h2>
              <p>
                Its original ID, artwork metadata, and traits are saved as the
                rendering source.
              </p>
              <div className="feedback">
                <strong>
                  {nft.number === 1541
                    ? "Meet your two looks."
                    : "Artwork preparation is next."}
                </strong>
                <br />
                {nft.number === 1541
                  ? "Your two artwork previews are ready. Source-linked minting is not yet enabled."
                  : "This Machin’s avatar and full-body assets have not been rendered yet."}
                Activation and downloads remain closed during this
                ownership-gate rollout.
              </div>
              {nft.number === 1541 && (
                <a href="https://nozomi-homes.perez-jg22.workers.dev/?prime=1541">
                  Visit #1541’s artwork preview →
                </a>
              )}
              <p className="small">
                Ownership will be checked again before creation or updates. If
                the NFT changes hands, the previous owner’s proof will no longer
                qualify.
              </p>
            </>
          ) : (
            <>
              <h2>
                Choose your
                <br />
                original.
              </h2>
              <label>
                Your Prime Machin
                <select
                  value={selected}
                  disabled={busy}
                  onChange={(e) => {
                    setSelected(e.target.value);
                    setVerified(false);
                    setMessage("");
                  }}
                >
                  {items.map((n) => (
                    <option key={n.objectId} value={n.objectId}>
                      Prime Machin #{n.number}
                    </option>
                  ))}
                </select>
              </label>
              <p>
                Confirm with a wallet message. This verifies control of the
                holding wallet and saves this Machin as the source.
              </p>
              <button className="primary" disabled={busy} onClick={verify}>
                {busy ? "Checking ownership…" : "Verify this Machin →"}
              </button>
              <p className="small">
                No mainnet transaction, payment, or NFT transfer. Future mascot
                transactions remain on testnet.
              </p>
            </>
          )}
          {message && (
            <details>
              <summary>Verification message</summary>
              <pre className="verification-message">{message}</pre>
            </details>
          )}
          {error && (
            <p role="alert" className="feedback error">
              {error}
            </p>
          )}
        </div>
      </section>
      <section className="details">
        <div>
          <span>01 / PROFILE</span>
          <h3>Your recognizable face.</h3>
          <p>
            A head-only avatar and reactions that preserve the source Machin’s
            identity.
          </p>
        </div>
        <div>
          <span>02 / COMPANION</span>
          <h3>A body for its little world.</h3>
          <p>
            A matching illustrated full body for the Walrus home. Newly designed
            body details will be labeled as our interpretation.
          </p>
        </div>
        <div>
          <span>03 / SAME ORIGINAL</span>
          <h3>Ownership comes first.</h3>
          <p>
            Both versions reference the same original NFT. The old open sample
            mint is closed.
          </p>
        </div>
      </section>
      <footer>
        <a href="https://www.tradeport.xyz/sui/collection/prime-machin">
          Based on the Prime Machin Collection ↗
        </a>
        <span>
          Original ownership · read-only mainnet / mascot testing · testnet
        </span>
      </footer>
    </main>
  );
}

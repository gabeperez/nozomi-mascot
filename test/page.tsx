import { NativeStudio } from "./native";
import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  createDAppKit,
  DAppKitProvider,
  useCurrentAccount,
  useDAppKit,
} from "@mysten/dapp-kit-react";
import { ConnectButton } from "@mysten/dapp-kit-react/ui";
import { Transaction } from "@mysten/sui/transactions";
import { Mascot } from "page-mascot";
import {
  client,
  PACKAGE,
  STUDIO,
  TYPE,
  colors,
  guard,
  parseCharacter,
  type Character,
} from "./config";
import { downloadGif, downloadPack, embedCode } from "./exports";
import "./style.css";
const kit = createDAppKit({
  networks: ["testnet"],
  createClient: () => client,
});
declare module "@mysten/dapp-kit-react" {
  interface Register {
    dAppKit: typeof kit;
  }
}
function Robot() {
  return (
    <Mascot
      directions="../mascots/nozomi-directions.webp"
      reactions="../mascots/nozomi-reactions.webp"
      size={300}
      label="Your robot companion"
    />
  );
}
function Embedded({ id }: { id: string }) {
  const [c, setC] = useState<Character>();
  const [error, setError] = useState("");
  useEffect(() => {
    client
      .getObject({ objectId: id, include: { json: true } })
      .then(({ object }) => {
        const v = parseCharacter(object);
        if (!v.unlocked) throw Error("This companion is not ready yet.");
        setC(v);
      })
      .catch(() => setError("This companion is unavailable."));
  }, [id]);
  return (
    <div className="embedded" style={{ background: colors[c?.palette ?? 0] }}>
      {c ? (
        <>
          <Robot />
          <strong>{c.name}</strong>
          <a href={location.pathname} target="_blank" rel="noreferrer">
            Meet your own Nozomi ↗
          </a>
        </>
      ) : (
        <p role="status">{error || "Waking up…"}</p>
      )}
    </div>
  );
}
function App() {
  const account = useCurrentAccount(),
    dapp = useDAppKit();
  const address = account?.address;
  const current = useRef(address);
  current.current = address;
  const [characters, setCharacters] = useState<Character[]>([]),
    [selected, setSelected] = useState(""),
    [name, setName] = useState("Mochi"),
    [palette, setPalette] = useState(0),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [balance, setBalance] = useState<number>(),
    [loaded, setLoaded] = useState(false),
    [digest, setDigest] = useState(""),
    [copy, setCopy] = useState(false);
  const character = characters.find((c) => c.id === selected),
    done = character?.unlocked;
  async function load(owner: string) {
    await guard();
    let cursor: string | null | undefined;
    const all: Character[] = [];
    do {
      const r = await client.listOwnedObjects({
        owner,
        type: TYPE,
        include: { json: true },
        cursor,
      });
      all.push(...r.objects.map(parseCharacter));
      cursor = r.hasNextPage ? r.cursor : null;
    } while (cursor);
    const b = await client.getBalance({ owner });
    if (current.current !== owner) return;
    setCharacters(all);
    setSelected((prev) =>
      all.some((c) => c.id === prev) ? prev : (all[0]?.id ?? ""),
    );
    setBalance(Number(b.balance.balance) / 1e9);
    setLoaded(true);
  }
  useEffect(() => {
    setCharacters([]);
    setSelected("");
    setLoaded(false);
    setError("");
    setNotice("");
    setDigest("");
    setBalance(undefined);
    if (address)
      load(address).catch(() => {
        if (current.current === address)
          setError("We couldn’t load your characters. Please try again.");
      });
  }, [address]);
  async function action(kind: "claim" | "unlock") {
    if (!address || busy) return;
    const owner = address;
    setBusy(kind);
    setError("");
    setNotice("");
    setDigest("");
    try {
      await guard();
      const tx = new Transaction();
      tx.setSender(owner);
      if (kind === "claim")
        tx.moveCall({
          target: `${PACKAGE}::studio::claim`,
          arguments: [tx.object(STUDIO)],
        });
      else {
        if (!character) throw Error("Choose a character first.");
        const clean = name.trim();
        if (!clean || new TextEncoder().encode(clean).length > 40)
          throw Error(
            "Choose a name between 1 and 40 bytes (about 40 English letters).",
          );
        const [coin] = tx.splitCoins(tx.gas, [10000000]);
        tx.moveCall({
          target: `${PACKAGE}::studio::unlock`,
          arguments: [
            tx.object(STUDIO),
            tx.object(character.id),
            tx.pure.string(clean),
            tx.pure.u8(palette),
            coin,
          ],
        });
      }
      setNotice("Approve the request in your wallet.");
      const r = await dapp.signAndExecuteTransaction({
        transaction: tx,
        network: "testnet",
      });
      if (r.FailedTransaction)
        throw Error(
          r.FailedTransaction.status.error?.message ||
            "The request did not complete.",
        );
      const hash = r.Transaction!.digest;
      if (current.current !== owner) return;
      setDigest(hash);
      setNotice("Saved on Sui. Updating your character…");
      await client.waitForTransaction({ digest: hash });
      await load(owner);
      setNotice(
        kind === "claim"
          ? "Your practice character is here. Give it a name."
          : "It’s yours. Your downloads are ready.",
      );
    } catch (e) {
      if (current.current !== owner) return;
      const m = e instanceof Error ? e.message : String(e);
      setError(
        /reject|cancel/i.test(m)
          ? "Request cancelled. You can try again whenever you’re ready."
          : /balance|gas|coin/i.test(m)
            ? "You need a little test SUI. Use the free test-money link below, then refresh."
            : m,
      );
      setNotice("");
    } finally {
      setBusy("");
    }
  }
  async function file(fn: () => Promise<void>) {
    setBusy("download");
    setError("");
    try {
      await fn();
    } catch {
      setError("That download didn’t finish. Please try again.");
    } finally {
      setBusy("");
    }
  }
  const showPalette = done ? character.palette : palette,
    showName = done ? character.name : name;
  return (
    <main>
      <header>
        <a className="brand" href="../">
          nozomi<span>little companion club</span>
        </a>
        <div className="header-right">
          <span className="test-pill">
            <i />
            Test run · no real money
          </span>
          {address && <ConnectButton />}
        </div>
      </header>
      <div className="intro">
        <p className="eyebrow">A LITTLE CHARACTER. A LOT OF PERSONALITY.</p>
        <h1>
          Your new favorite
          <br />
          <em>plus one.</em>
        </h1>
        <p>
          A curious little robot for your corner of the internet.
          <br />
          Give it a name. Make it yours. Take it everywhere.
        </p>
      </div>
      <section className="studio">
        <div className="preview" style={{ background: colors[showPalette] }}>
          <span className="preview-label">
            {done ? "YOURS TO KEEP" : "LIVE PREVIEW"}
          </span>
          <div className="robot">
            <Robot />
          </div>
          <div className="nameplate">
            {showName.trim() || "Your Nozomi"}
            <span>Try moving your cursor. Say hi with a click.</span>
          </div>
          <span className="sample">Sample artwork · Prime Machin inspired</span>
        </div>
        <div className="controls">
          <nav aria-label="Progress">
            {["Meet", "Make yours", "Take home"].map((s, i) => (
              <span
                className={(done ? 2 : character ? 1 : 0) === i ? "active" : ""}
                key={s}
              >
                {i + 1} / {s}
              </span>
            ))}
          </nav>
          {!address ? (
            <>
              <p className="eyebrow">FIRST, SAY HELLO</p>
              <h2>
                A tiny friend.
                <br />A place to call home.
              </h2>
              <p>
                Connect a Sui wallet to save your companion. Think of it as its
                little digital home.
              </p>
              <div className="connect">
                <ConnectButton />
              </div>
              <p className="small">
                New here? The connection menu can help you find a wallet. This
                practice run uses free test tokens.
              </p>
            </>
          ) : !loaded ? (
            <>
              <h2>Finding your companions…</h2>
              <p>Reading your collection.</p>
            </>
          ) : !character ? (
            <>
              <p className="eyebrow">LET’S GET ACQUAINTED</p>
              <h2>Meet your first Nozomi.</h2>
              <p>
                Get a practice character, then choose a name and a backdrop.
                Creating it is free; the test network charges a small fee.
              </p>
              <button
                className="primary"
                disabled={!!busy}
                onClick={() => action("claim")}
              >
                {busy === "claim"
                  ? "Bringing it home…"
                  : "Get my practice character →"}
              </button>
              <p className="small">
                One practice character per wallet. If you’ve given yours away,
                reconnect the wallet that holds it.
              </p>
            </>
          ) : done ? (
            <>
              <p className="eyebrow">YOU TWO LOOK GOOD TOGETHER</p>
              <h2>
                {character.name} is
                <br />
                ready to go.
              </h2>
              <p>
                Your name and backdrop are saved with this character. Come back
                with its wallet to download again.
              </p>
              <div className="downloads">
                <button
                  className="primary"
                  disabled={!!busy}
                  onClick={() => file(() => downloadGif(character))}
                >
                  ↓ Download animated GIF
                </button>
                <button
                  disabled={!!busy}
                  onClick={() => file(() => downloadPack(character))}
                >
                  ↓ Download website kit
                </button>
                <button
                  onClick={async () => {
                    setCopy(true);
                    try {
                      await navigator.clipboard.writeText(embedCode(character));
                      setNotice(
                        "Embed copied. Paste it into your website’s HTML.",
                      );
                    } catch {
                      setNotice("Copy the embed code below.");
                    }
                  }}
                >
                  ↗ Copy website embed
                </button>
              </div>
              {copy && (
                <textarea
                  aria-label="Website embed code"
                  readOnly
                  value={embedCode(character)}
                  onFocus={(e) => e.target.select()}
                />
              )}
              <a
                className="primary home-link"
                href={
                  "https://nozomi-homes.perez-jg22.workers.dev/?id=" +
                  character.id
                }
              >
                Visit your companion’s home →
              </a>
              <p className="small">
                Website kit includes sprite sheets, CSS, JavaScript, GIF, and
                your character record.
              </p>
            </>
          ) : (
            <>
              <p className="eyebrow">LET YOUR PERSONALITY SHOW</p>
              <h2>
                Make a little
                <br />
                introduction.
              </h2>
              {characters.length > 1 && (
                <label>
                  Character
                  <select
                    value={selected}
                    onChange={(e) => setSelected(e.target.value)}
                  >
                    {characters.map((c) => (
                      <option value={c.id} key={c.id}>
                        {c.name} · {c.id.slice(-6)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                A name for your companion
                <input
                  value={name}
                  maxLength={40}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Mochi"
                />
              </label>
              <fieldset>
                <legend>Pick a backdrop</legend>
                <div className="swatches">
                  {["Oat", "Sky", "Peach", "Sage"].map((s, i) => (
                    <button
                      key={s}
                      aria-pressed={palette === i}
                      onClick={() => setPalette(i)}
                      style={{ background: colors[i] }}
                    >
                      {s}
                      {palette === i ? " ✓" : ""}
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className="price">
                <span>
                  Keep it + all downloads<strong>0.01 test SUI</strong>
                </span>
                <small>
                  Plus the network fee shown in your wallet. Name and backdrop
                  are permanent once saved.
                </small>
              </div>
              <button
                className="primary"
                disabled={!!busy || !name.trim()}
                onClick={() => action("unlock")}
              >
                {busy === "unlock" ? "Making it yours…" : "Make it mine →"}
              </button>
            </>
          )}
          {(notice || error) && (
            <div
              className={error ? "feedback error" : "feedback"}
              role={error ? "alert" : "status"}
            >
              {error || notice}
            </div>
          )}
          {digest && (
            <a
              className="small"
              target="_blank"
              rel="noreferrer"
              href={`https://suiscan.xyz/testnet/tx/${digest}`}
            >
              View saved receipt ↗
            </a>
          )}
          {address && (
            <div className="wallet-help">
              <span>
                {balance === undefined
                  ? ""
                  : `${balance.toFixed(3)} test SUI available`}
              </span>
              <a
                href={`https://faucet.sui.io/?address=${address}`}
                target="_blank"
                rel="noreferrer"
              >
                Get free test money ↗
              </a>
              <button
                disabled={!!busy}
                onClick={() => {
                  setError("");
                  load(address).catch(() =>
                    setError("Couldn’t refresh. Try again shortly."),
                  );
                }}
              >
                Refresh
              </button>
            </div>
          )}
        </div>
      </section>
      <section className="details">
        <div>
          <span>01 / YOUR LITTLE SIDEKICK</span>
          <h3>More than a still image.</h3>
          <p>
            Follows your cursor, lights up when you click, and brings a little
            life to your website.
          </p>
        </div>
        <div>
          <span>02 / PACKED & READY</span>
          <h3>Yours to take along.</h3>
          <p>
            An animated GIF for sharing. A website kit for tinkering. One line
            of code to embed.
          </p>
        </div>
        <div>
          <span>03 / A PRACTICE RUN</span>
          <h3>Real saving. Test money.</h3>
          <p>
            This creates a real test character on Sui. Everyone uses the same
            sample art; custom AI art and Prime Machin ownership checks are
            coming later.
          </p>
        </div>
      </section>
      <footer>
        <a href="https://www.tradeport.xyz/sui/collection/prime-machin">
          Based on the Prime Machin Collection ↗
        </a>
        <a href="https://github.com/gabeperez/nozomi-mascot">
          Made with curiosity · source ↗
        </a>
      </footer>
    </main>
  );
}
const embed = new URLSearchParams(location.search).get("embed");
createRoot(document.getElementById("root")!).render(
  embed ? (
    <Embedded id={embed} />
  ) : (
    <DAppKitProvider dAppKit={kit}>
      {new URLSearchParams(location.search).has("wallet") ? (
        <App />
      ) : (
        <NativeStudio />
      )}
    </DAppKitProvider>
  ),
);

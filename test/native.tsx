import { useState, useEffect, useRef } from "react";
import { Mascot } from "page-mascot";
import type { PasskeyKeypair } from "@mysten/sui/keypairs/passkey";
import {
  cachedPasskey,
  createPasskey,
  recoverPasskey,
  confirmCompanion,
} from "./passkey";
import { client, TYPE, colors, parseCharacter, type Character } from "./config";
import { downloadGif, downloadPack, embedCode } from "./exports";
export function NativeStudio() {
  const [signer, setSigner] = useState<PasskeyKeypair | null>(() =>
      cachedPasskey(),
    ),
    [name, setName] = useState("Mochi"),
    [palette, setPalette] = useState(0),
    [character, setCharacter] = useState<Character>(),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [loaded, setLoaded] = useState(false),
    [code, setCode] = useState("");
  const version = useRef(0);
  async function refresh(s: PasskeyKeypair) {
    const v = ++version.current;
    setLoaded(false);
    try {
      const r = await client.listOwnedObjects({
        owner: s.toSuiAddress(),
        type: TYPE,
        include: { json: true },
      });
      if (version.current !== v) return;
      setCharacter(r.objects.map(parseCharacter).find((c) => c.unlocked));
      setLoaded(true);
    } catch {
      if (version.current === v)
        setError("We couldn’t load your companion. Please refresh.");
    }
  }
  useEffect(() => {
    if (signer) void refresh(signer);
    else {
      version.current++;
      setCharacter(undefined);
      setLoaded(true);
    }
  }, [signer]);
  async function run(label: string, fn: () => Promise<void>) {
    if (busy) return;
    setBusy(label);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      setError(
        /cancel|notallowed|timed out|not allowed/i.test(m)
          ? "Confirmation cancelled. Nothing else is needed until you’re ready."
          : m,
      );
    } finally {
      setBusy("");
    }
  }
  const shown = character?.palette ?? palette,
    home = character
      ? "https://nozomi-homes.perez-jg22.workers.dev/?id=" + character.id
      : "";
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
          {signer && (
            <button
              onClick={() => {
                localStorage.removeItem("nozomi-passkey-public-v1");
                setSigner(null);
              }}
              disabled={!!busy}
            >
              Sign out
            </button>
          )}
        </div>
      </header>
      <div className="intro">
        <p className="eyebrow">YOUR LITTLE CORNER OF THE INTERNET</p>
        <h1>
          A little friend.
          <br />
          <em>A home of its own.</em>
        </h1>
        <p>
          Create with a passkey. Confirm with a touch.
          <br />
          No wallet extension. Test fees are on us.
        </p>
      </div>
      <section className="studio">
        <div className="preview" style={{ background: colors[shown] }}>
          <span className="preview-label">
            {character ? "WELCOME HOME" : "MEET YOUR COMPANION"}
          </span>
          <Mascot
            directions="../mascots/nozomi-directions.webp"
            reactions="../mascots/nozomi-reactions.webp"
            size={300}
          />
          <div className="nameplate">
            {character?.name || name || "Your Nozomi"}
            <span>A little wave goes a long way. Give me a click.</span>
          </div>
          <span className="sample">
            Shared sample artwork · Prime Machin inspired
          </span>
        </div>
        <div className="controls">
          <nav aria-label="Progress">
            <span className={!signer ? "active" : ""}>1 / Say hello</span>
            <span className={signer && !character ? "active" : ""}>
              2 / Make yours
            </span>
            <span className={character ? "active" : ""}>3 / Come home</span>
          </nav>
          {!signer ? (
            <>
              <p className="eyebrow">A FAMILIAR WAY IN</p>
              <h2>
                Just you.
                <br />
                And your fingerprint.
              </h2>
              <p>
                Use Face ID, Touch ID, or your device’s screen lock to create a
                Nozomi account.
              </p>
              <button
                className="primary"
                disabled={!!busy}
                onClick={() =>
                  run("Creating your account…", async () =>
                    setSigner(await createPasskey()),
                  )
                }
              >
                Create with a passkey →
              </button>
              <button
                disabled={!!busy}
                onClick={() =>
                  run("Finding your passkey…", async () =>
                    setSigner(await recoverPasskey()),
                  )
                }
              >
                I already have a passkey
              </button>
              <p className="small">
                Your device keeps the private key. Use the same saved passkey to
                return. Recovery on a new browser may ask you to confirm twice.
              </p>
              <a className="small" href="?wallet=1">
                Already made a character with Slush? Open wallet mode ↗
              </a>
            </>
          ) : !loaded ? (
            <>
              <h2>Finding your little friend…</h2>
              <button onClick={() => refresh(signer)} disabled={!!busy}>
                Refresh
              </button>
            </>
          ) : character ? (
            <>
              <p className="eyebrow">YOUR PLACE IS READY</p>
              <h2>
                {character.name}
                <br />
                has a home.
              </h2>
              <p>
                Keep this link. You can visit and share your companion without
                signing in.
              </p>
              <a className="primary home-link" href={home}>
                Visit {character.name}’s home →
              </a>
              <button
                disabled={!!busy}
                onClick={() =>
                  run("Copying…", async () => {
                    try {
                      await navigator.clipboard.writeText(home);
                      setNotice("Home link copied.");
                    } catch {
                      setCode(home);
                    }
                  })
                }
              >
                Copy home link
              </button>
              <div className="downloads">
                <button
                  disabled={!!busy}
                  onClick={() =>
                    run("Packing your GIF…", () => downloadGif(character))
                  }
                >
                  ↓ Download GIF
                </button>
                <button
                  disabled={!!busy}
                  onClick={() =>
                    run("Packing your kit…", () => downloadPack(character))
                  }
                >
                  ↓ Download website kit
                </button>
                <button onClick={() => setCode(embedCode(character))}>
                  Get embed code
                </button>
              </div>
              {code && (
                <textarea
                  aria-label="Copyable link or code"
                  value={code}
                  readOnly
                  onFocus={(e) => e.target.select()}
                />
              )}
            </>
          ) : (
            <>
              <p className="eyebrow">ONE LITTLE INTRODUCTION</p>
              <h2>
                What should
                <br />
                we call you?
              </h2>
              <label>
                Companion’s name
                <input
                  value={name}
                  maxLength={40}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <fieldset>
                <legend>A color for their corner</legend>
                <div className="swatches">
                  {["Oat", "Sky", "Peach", "Sage"].map((s, i) => (
                    <button
                      key={s}
                      style={{ background: colors[i] }}
                      aria-pressed={i === palette}
                      onClick={() => setPalette(i)}
                    >
                      {s}
                      {i === palette ? " ✓" : ""}
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className="price">
                <span>
                  Create + personalize + downloads
                  <strong>Free test invitation</strong>
                </span>
                <small>
                  We cover the test payment and network fee. Your name and
                  backdrop are saved permanently with the character.
                </small>
              </div>
              <button
                className="primary"
                disabled={!!busy || !name.trim()}
                onClick={() =>
                  run("Preparing your confirmation…", async () => {
                    const { digest } = await confirmCompanion(
                      signer,
                      name.trim(),
                      palette,
                      () => setBusy("Bringing your companion home…"),
                    );
                    await client.waitForTransaction({ digest });
                    await refresh(signer);
                    setNotice("Welcome home. Your companion is saved.");
                  })
                }
              >
                Confirm →
              </button>
              <p className="small">
                Your device will ask for a biometric or screen-lock
                confirmation. Limited test invitations each day.
              </p>
              <button disabled={!!busy} onClick={() => refresh(signer)}>
                Refresh saved character
              </button>
            </>
          )}
          {busy && (
            <p role="status" className="feedback">
              {busy}
            </p>
          )}
          {error && (
            <p role="alert" className="feedback error">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="feedback">
              {notice}
            </p>
          )}
        </div>
      </section>
      <section className="details">
        <div>
          <span>01 / FEELS LIKE HOME</span>
          <h3>A page to come back to.</h3>
          <p>
            Every companion has a shareable address. No sign-in needed to visit.
          </p>
        </div>
        <div>
          <span>02 / BUILT TO GROW</span>
          <h3>Room for a little life.</h3>
          <p>
            Today: a curious robot. Later: moods, memories, and everyday
            rituals. Persistent pet gameplay is still being built.
          </p>
        </div>
        <div>
          <span>03 / HONESTLY A TEST</span>
          <h3>Real character. Sample art.</h3>
          <p>
            Passkeys create a separate test account. Original Prime Machin
            ownership and Google sign-in aren’t connected yet.
          </p>
        </div>
      </section>
      <footer>
        <a href="https://www.tradeport.xyz/sui/collection/prime-machin">
          Based on the Prime Machin Collection ↗
        </a>
        <a href="?wallet=1">Wallet mode</a>
      </footer>
    </main>
  );
}

import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Mascot } from "page-mascot";
import { client, parseCharacter, colors, type Character } from "../test/config";
import "./style.css";
import { PrimeHome } from "./prime";
const studio = "https://gabeperez.github.io/nozomi-mascot/test/";
function Home() {
  const [c, setC] = useState<Character>(),
    [error, setError] = useState(""),
    [quiet, setQuiet] = useState(false),
    [greeting, setGreeting] = useState("A little company makes a good day.");
  const id = new URLSearchParams(location.search).get("id");
  useEffect(() => {
    if (!id) {
      setError("This home needs a companion link.");
      return;
    }
    client
      .getObject({ objectId: id, include: { json: true } })
      .then(({ object }) => {
        const v = parseCharacter(object);
        if (!v.unlocked) throw Error("This companion is still getting ready.");
        setC(v);
        document.title = v.name + "’s home · Nozomi";
      })
      .catch(() =>
        setError(
          "We couldn’t find this companion. Check the link or try again shortly.",
        ),
      );
  }, [id]);
  return (
    <main
      className={quiet ? "quiet" : ""}
      style={{ "--room": colors[c?.palette ?? 0] } as React.CSSProperties}
    >
      <header>
        <a href={studio}>
          nozomi<span>a little place to belong</span>
        </a>
        <span className="status">
          <i />
          {quiet ? "A quiet moment" : "Home, sweet home"}
        </span>
      </header>
      {c ? (
        <>
          <section className="room">
            <p className="eyebrow">YOU’RE ALWAYS WELCOME HERE</p>
            <h1>{c.name}’s little home.</h1>
            <div className="window">
              <span className="sun" />
              <span className="horizon" />
            </div>
            <div className="friend">
              <Mascot
                directions="../mascots/nozomi-directions.webp"
                reactions="../mascots/nozomi-reactions.webp"
                size={Math.min(340, window.innerWidth - 40)}
              />
            </div>
            <p className="greeting" role="status">
              {greeting}
            </p>
            <div className="actions">
              <button
                onClick={() =>
                  setGreeting(
                    [
                      "Hey, you. Glad you stopped by.",
                      "I saved you a little sunshine.",
                      "No big plans. Just happy you’re here.",
                    ][Math.floor(Math.random() * 3)]!,
                  )
                }
              >
                ♡ Say hello
              </button>
              <button
                onClick={() => {
                  setQuiet(!quiet);
                  setGreeting(
                    !quiet
                      ? "Let’s watch the world slow down."
                      : "There you are. Ready for a little sunshine?",
                  );
                }}
              >
                {quiet ? "☀ Let the light in" : "☾ A quiet moment"}
              </button>
            </div>
            <p className="note">
              These little moments are just for this visit.
              <br />
              Memories, growth, and daily care are still to come.
            </p>
          </section>
          <footer>
            <div>
              <span>CHARACTER PASSPORT</span>
              <a
                href={`https://suiscan.xyz/testnet/object/${c.id}`}
                target="_blank"
                rel="noreferrer"
              >
                Sui testnet · {c.id.slice(0, 8)}…{c.id.slice(-6)} ↗
              </a>
            </div>
            <p>
              Shared Nozomi artwork · Based on Prime Machin
              <br />
              The character is on Sui; the home app can be updated
              independently.
            </p>
            <a href={studio}>Make a little friend ↗</a>
          </footer>
        </>
      ) : (
        <section className="empty">
          <h1>{error ? "A little detour." : "Waking up…"}</h1>
          <p role="status">{error || "Opening the door for your companion."}</p>
          {error && <a href={studio}>Back to the studio →</a>}
        </section>
      )}
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  new URLSearchParams(location.search).get("prime") === "1541" ? (
    <PrimeHome />
  ) : (
    <Home />
  ),
);

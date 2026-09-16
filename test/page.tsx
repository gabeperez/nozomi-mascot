import { OwnershipStudio } from "./ownership";
import { mainnet } from "../server/prime-ownership";
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
  networks: ["testnet", "mainnet"],
  createClient: (network) => (network === "mainnet" ? mainnet : client),
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
const embed = new URLSearchParams(location.search).get("embed");
createRoot(document.getElementById("root")!).render(
  embed ? (
    <Embedded id={embed} />
  ) : (
    <DAppKitProvider dAppKit={kit}>
      <OwnershipStudio />
    </DAppKitProvider>
  ),
);

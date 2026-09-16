import { zipSync, strToU8 } from "fflate";
import { colors, PACKAGE, type Character } from "./config";
export function save(data: Uint8Array, name: string, type = "application/zip") {
  const url = URL.createObjectURL(new Blob([new Uint8Array(data)], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
export async function downloadGif(c: Character) {
  const r = await fetch(`../mascots/nozomi-${c.palette}.gif`);
  if (!r.ok) throw new Error("Download unavailable. Please retry.");
  save(new Uint8Array(await r.arrayBuffer()), "nozomi.gif", "image/gif");
}
export function embedUrl(c: Character) {
  const u = new URL(location.href);
  u.search = "";
  u.searchParams.set("embed", c.id);
  return u.href;
}
export function embedCode(c: Character) {
  return `<iframe src="${embedUrl(c)}" title="Nozomi companion" width="320" height="360" style="border:0;border-radius:24px" loading="lazy"></iframe>`;
}
export async function downloadPack(c: Character) {
  const files: Record<string, Uint8Array> = {};
  for (const name of [
    "directions.webp",
    "reactions.webp",
    `${c.palette}.gif`,
  ]) {
    const r = await fetch("../mascots/nozomi-" + name);
    if (!r.ok) throw new Error("Could not load the artwork. Please retry.");
    files[name] = new Uint8Array(await r.arrayBuffer());
  }
  files["mascot.css"] = strToU8(
    `.nozomi{width:240px;height:240px;background-image:url(directions.webp);background-size:300% 300%;background-position:50% 50%;cursor:pointer}.nozomi:hover{background-image:url(reactions.webp)}body{background:${colors[c.palette]};font-family:system-ui;display:grid;place-content:center;min-height:100vh;margin:0}`,
  );
  files["mascot.js"] = strToU8(
    `const m=document.querySelector('.nozomi');let reacting=false;document.addEventListener('pointermove',e=>{if(reacting)return;const r=m.getBoundingClientRect(),x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2;const col=Math.abs(x)<80?1:x<0?0:2,row=Math.abs(y)<80?1:y<0?0:2;m.style.backgroundPosition=(col*50)+'% '+(row*50)+'%'});m.addEventListener('click',()=>{reacting=true;m.style.backgroundImage='url(reactions.webp)';m.style.backgroundPosition='50% 0%';setTimeout(()=>{reacting=false;m.style.backgroundImage='url(directions.webp)'},1000)});`,
  );
  files["index.html"] = strToU8(
    '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Nozomi companion</title><link rel="stylesheet" href="mascot.css"><div class="nozomi" role="img" aria-label="Interactive robot companion"></div><script src="mascot.js"></script></html>',
  );
  files["character.json"] = strToU8(
    JSON.stringify(
      {
        ...c,
        network: "sui:testnet",
        package: PACKAGE,
        templateVersion: 1,
        artwork: "Shared Nozomi sample; not AI generated per NFT",
      },
      null,
      2,
    ),
  );
  files["README.txt"] = strToU8(
    "Open index.html to meet your companion. Copy mascot.css, mascot.js, and both WebP files into your site. The 3x3 sprite sheets use 360px cells. The GIF uses your selected backdrop. Character identity and customization are recorded on Sui testnet. Artwork is a shared sample based on Prime Machin. This public download is not DRM or an exclusive art license.\n\nHosted embed:\n" +
      embedCode(c),
  );
  save(zipSync(files), "nozomi-website-kit.zip");
}

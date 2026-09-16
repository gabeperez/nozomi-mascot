import { mainnet, PRIME_PACKAGE } from "../server/prime-ownership";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const number = Number(process.argv[2] || 1541),
  dir = `characters/prime-${number}`;
const source = JSON.parse(await readFile(`${dir}/source.json`, "utf8"));
const img = source.json.image;
const chunks = await Promise.all(
  img.chunks.contents.map(async (entry: any) => {
    const { object } = await mainnet.getObject({
      objectId: entry.value,
      include: { json: true },
    });
    const c = object.json as any;
    if (
      object.type !== `${PRIME_PACKAGE}::image::ImageChunk` ||
      c.image_id !== img.id ||
      c.number !== number ||
      c.hash !== entry.key ||
      createHash("sha256").update(c.data).digest("hex") !== entry.key
    )
      throw Error("Invalid image chunk");
    return c;
  }),
);
chunks.sort((a, b) => a.index - b.index);
if (chunks.some((c, i) => c.index !== i + 1))
  throw Error("Missing image chunk");
await writeFile(`${dir}/art.base85`, chunks.map((c) => c.data).join(""));
await writeFile(
  `${dir}/provenance.json`,
  JSON.stringify(
    {
      network: "mainnet",
      objectId: source.objectId,
      objectVersion: source.version,
      imageId: img.id,
      number,
      verifiedChunks: chunks.map(({ index, hash, id }) => ({
        index,
        hash,
        id,
      })),
    },
    null,
    2,
  ),
);
console.log(`Verified ${chunks.length} on-chain chunks for #${number}`);

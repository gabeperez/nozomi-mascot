import manifest from "../deployments/walrus-home-testnet.json";
// This portal serves a pinned, verified release of our shared Walrus Site.
// It is read-only: no wallet, signing key, or sponsorship API is exposed here.
export default {
  async fetch(req: Request) {
    if (req.method !== "GET" && req.method !== "HEAD")
      return new Response("Method not allowed", { status: 405 });
    const path = new URL(req.url).pathname;
    const key = path === "/" ? "/index.html" : path;
    const resource = (
      manifest.resources as Record<string, { patch: string; sha256: string }>
    )[key];
    if (!resource) return new Response("Not found", { status: 404 });
    try {
      const upstream = await fetch(
        "https://aggregator.walrus-testnet.walrus.space/v1/blobs/by-quilt-patch-id/" +
          resource.patch,
      );
      if (!upstream.ok) throw Error("Walrus resource unavailable");
      const bytes = await upstream.arrayBuffer();
      const hash = Array.from(
        new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
        (x) => x.toString(16).padStart(2, "0"),
      ).join("");
      if (hash !== resource.sha256) throw Error("Integrity check failed");
      const type = key.endsWith(".html")
        ? "text/html; charset=utf-8"
        : key.endsWith(".js")
          ? "text/javascript; charset=utf-8"
          : key.endsWith(".css")
            ? "text/css; charset=utf-8"
            : key.endsWith(".webp")
              ? "image/webp"
              : "application/octet-stream";
      return new Response(req.method === "HEAD" ? null : bytes, {
        headers: {
          "Content-Type": type,
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": key.endsWith(".html")
            ? "public, max-age=60"
            : "public, max-age=86400",
          "X-Walrus-Site": manifest.siteObject,
          "X-Walrus-Quilt-Patch": resource.patch,
          "Content-Security-Policy":
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src https://fullnode.testnet.sui.io; base-uri 'none'; object-src 'none'; frame-ancestors *",
        },
      });
    } catch {
      return new Response(
        "This home is taking a moment to wake up. Please try again shortly.",
        { status: 503, headers: { "Retry-After": "15" } },
      );
    }
  },
};

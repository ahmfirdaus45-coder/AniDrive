const express = require("express");
const fetch = require("node-fetch");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.DROPBOX_ACCESS_TOKEN) {
  console.warn("DROPBOX_ACCESS_TOKEN belum diatur.");
}

app.use(express.static(path.join(__dirname, "..", "frontend")));

async function dropboxApi(endpoint, body) {
  const r = await fetch(`https://api.dropboxapi.com/2/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.DROPBOX_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`${endpoint}: ${r.status} ${text}`);
  return JSON.parse(text);
}

// Streaming proxy dengan dukungan HTTP Range.
app.get("/api/media", async (req, res) => {
  try {
    const pathOrId = req.query.path;
    if (!pathOrId) return res.status(400).send("Missing path");

    const meta = await dropboxApi("files/get_temporary_link", {
      path: pathOrId,
    });
    const headers = {};
    if (req.headers.range) headers.Range = req.headers.range;

    const upstream = await fetch(meta.link, { headers });

    if (!upstream.ok && upstream.status !== 206) {
      return res.status(upstream.status).send("Dropbox streaming failed");
    }

    res.status(upstream.status);
    for (const h of [
      "content-type",
      "content-length",
      "content-range",
      "accept-ranges",
      "etag",
      "last-modified",
    ]) {
      const v = upstream.headers.get(h);
      if (v) res.setHeader(h, v);
    }
    res.setHeader("Cache-Control", "no-store");

    upstream.body.pipe(res);
  } catch (e) {
    console.error(e);
    res.status(500).send("Proxy error");
  }
});

app.get("/api/health", (_, res) => res.json({ ok: true }));
app.listen(PORT, () => console.log(`AniDrive proxy listening on :${PORT}`));

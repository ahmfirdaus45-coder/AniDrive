// AniDrive - Google Drive original-file streaming proxy for Vercel.
// Use: /api/media?path=GOOGLE_DRIVE_FILE_ID
// or: /api/media?path=https://drive.google.com/file/d/FILE_ID/view

export default async function handler(req, res) {
  try {
    const raw = String(req.query?.path || req.query?.id || req.query?.fileId || '').trim();
    if (!raw) return res.status(400).send('Missing Google Drive file ID or URL');

    const fileId = extractDriveId(raw);
    if (!fileId) return res.status(400).send('Invalid Google Drive file ID or URL');

    const upstreamUrl =
      `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download&confirm=t`;

    const headers = {};
    if (req.headers.range) headers.Range = req.headers.range;
    if (req.headers['if-none-match']) headers['If-None-Match'] = req.headers['if-none-match'];

    const upstream = await fetch(upstreamUrl, {
      method: 'GET',
      headers,
      redirect: 'follow',
    });

    const contentType = upstream.headers.get('content-type') || '';
    const contentDisposition = upstream.headers.get('content-disposition') || '';

    if (!upstream.ok || contentType.includes('text/html')) {
      const text = await upstream.text();
      console.error('Google Drive upstream error:', upstream.status, text.slice(0, 500));
      return res.status(upstream.ok ? 502 : upstream.status)
        .send('Google Drive tidak mengirim file video. Pastikan file dapat diakses publik.');
    }

    res.status(upstream.status);

    for (const name of [
      'content-type',
      'content-length',
      'content-range',
      'accept-ranges',
      'etag',
      'last-modified',
    ]) {
      const value = upstream.headers.get(name);
      if (value) res.setHeader(name, value);
    }

    if (contentDisposition) res.setHeader('Content-Disposition', contentDisposition);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, If-None-Match');
    res.setHeader(
      'Access-Control-Expose-Headers',
      'Accept-Ranges, Content-Length, Content-Range, Content-Type, ETag, Last-Modified'
    );
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');

    if (req.method === 'HEAD') return res.end();

    // Vercel/Node ReadableStream.
    if (upstream.body && typeof upstream.body.pipe === 'function') {
      return upstream.body.pipe(res);
    }

    if (upstream.body) {
      const reader = upstream.body.getReader();
      res.on('close', () => reader.cancel().catch(() => {}));

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (!res.write(Buffer.from(value))) {
          await new Promise(resolve => res.once('drain', resolve));
        }
      }
    }

    return res.end();
  } catch (error) {
    console.error('AniDrive media proxy error:', error);
    return res.status(500).send('Video proxy error');
  }
}

function extractDriveId(value) {
  if (/^[a-zA-Z0-9_-]{10,}$/.test(value)) return value;

  let match = value.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];

  try {
    const url = new URL(value);
    const id = url.searchParams.get('id');
    if (id && /^[a-zA-Z0-9_-]{10,}$/.test(id)) return id;
  } catch (_) {}

  match = value.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

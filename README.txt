# AniDrive Google Drive Vercel Proxy

Upload `api/media.js` into the AniDrive repository.

Endpoint:
`/api/media?path=GOOGLE_DRIVE_FILE_ID`

It also accepts a Google Drive sharing URL:
`/api/media?path=https://drive.google.com/file/d/FILE_ID/view`

The proxy forwards HTTP Range headers so the HTML5 video player can seek and request the original file instead of using the Google Drive preview player.

Important:
- The Drive video must be accessible to anyone who has the link.
- This does not magically convert a video to 4K. The source file itself must be 4K and encoded with a codec the browser/device can decode.
- For AniDrive, the frontend video source must point to `/api/media?path=FILE_ID`.

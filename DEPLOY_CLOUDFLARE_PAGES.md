# Cloudflare Pages Deployment Note

## Build Settings
- Framework preset: Next.js
- Build command: `npm run build`
- Output directory: `.next`

## Notes
- If using advanced server features on Cloudflare, add adapter/config in next phase.
- Current architecture is data-driven and can run as static-first with selective dynamic features.

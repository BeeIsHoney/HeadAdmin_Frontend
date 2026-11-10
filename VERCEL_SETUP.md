# Vercel deployment — Head Admin

Repository: `BeeIsHoney/HeadAdmin_Frontend` (Next.js 16).

1. Import the GitHub repository into Vercel as a **Next.js** project. Root directory: repository root.
2. Set server-only `MAIN_BACKEND_URL=https://tornadoservicemainbackend-production.up.railway.app` (no `/api` suffix). Never use `NEXT_PUBLIC_` for backend secrets.
3. Build command: `npm run build`. Node: 22.x or newer compatible with the package engines.
4. Visit the deployment URL, sign in using a Head Admin account, then test `/shops/register`, Telegram owner registration and the service clients page.
5. Verify Main Backend is online and matches the deployed API version. The browser uses same-origin Next API routes; login credentials and tokens are forwarded server-side with HTTP-only session cookies.
6. The shared Admin and Gateway Telegram bots poll **Main Backend**. Do not add bot tokens or gateway secrets to the frontend deployment. Shop customer bot website URLs should point at the actual deployed Vercel customer site for that shop.

No public environment variables are required. Keep `.env.local` out of Git.

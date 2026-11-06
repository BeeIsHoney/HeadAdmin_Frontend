import type { NextConfig } from 'next';
const extraDevOrigins=(process.env.FRONTEND_ALLOWED_HOSTS||'').split(',').map(value=>value.trim()).filter(Boolean);
const config: NextConfig = {
  allowedDevOrigins: ['*.trycloudflare.com',...extraDevOrigins,'192.168.*.*','10.*.*.*',...Array.from({length:16},(_,i)=>`172.${i+16}.*.*`)],
  poweredByHeader: false,
  outputFileTracingRoot: process.cwd(),
  experimental: { cpus: 2 },
  async headers() { return [{source: '/(.*)', headers: [
    {key:'X-Content-Type-Options',value:'nosniff'},
    {key:'X-JiaFu-Panel',value:'main-admin-v1.7.0'},
    {key:'Referrer-Policy',value:'same-origin'},
    {key:'X-Frame-Options',value:'DENY'},
    {key:'Cache-Control',value:'no-store'}
  ]}]; }
};
export default config;

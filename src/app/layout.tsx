import type { Metadata,Viewport } from 'next';
import './globals.css';
import './product-management.css';
import './mobile.css';
import './head-ui.css';
import './reference-create.css';
import Panel from '@/components/panel';
import {Suspense} from 'react';
import { PANEL } from '@/lib/config';
export const metadata: Metadata = {title: `Tornado · ${PANEL.title}`, description:'Tornado shop management workspace'};
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',interactiveWidget:'resizes-content'};
export default function Layout({children}: Readonly<{children: React.ReactNode}>) {
 return <html lang="en"><body><Suspense fallback={<main className="boot">Loading workspace…</main>}><Panel>{children}</Panel></Suspense></body></html>;
}

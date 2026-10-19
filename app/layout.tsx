import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import "./interface.css";

export const metadata: Metadata = {
  title: "Relay — Incident workbench",
  description:
    "Investigate retail outages with service dependencies, team ownership and AI reports linked to telemetry. A technical demo built on Vercel.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="dark"
      data-scroll-behavior="smooth"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          // Default to the control-room palette; preserve an explicit user choice.
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('relay-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t;}catch(e){}",
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

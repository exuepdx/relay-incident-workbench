import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Relay — from signals to a next step",
  description:
    "An incident investigation agent that reads the customer's existing telemetry and proposes the next check. Built on Vercel.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

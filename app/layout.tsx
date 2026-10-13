import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Relay — from signals to a next step",
  description: "An evidence-first incident investigation workbench. A synthetic enterprise scenario built with Vercel.",
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

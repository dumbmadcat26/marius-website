import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import Script from "next/script";
import { StartupScreen } from "@/components/StartupScreen";
import { STARTUP_SESSION_SCRIPT } from "@/lib/startup";
import { getSiteSetting } from "@/lib/strapi";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-plex",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  try {
    const site = await getSiteSetting();
    return {
      title: {
        default: site?.siteName || "Marius Varhaugvik",
        template: `%s · ${site?.siteName || "Marius Varhaugvik"}`,
      },
      description:
        site?.tagline ||
        "Composer, sound designer & artistic stage engineer",
    };
  } catch {
    return {
      title: "Marius Varhaugvik",
      description: "Composer, sound designer & artistic stage engineer",
    };
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={plexSans.variable}>
      <head>
        <link rel="preload" href="/marius-intro.jpg" as="image" />
      </head>
      <body>
        <Script id="startup-session" strategy="beforeInteractive">
          {STARTUP_SESSION_SCRIPT}
        </Script>
        <noscript>
          <style>{`[data-startup]{display:none!important}`}</style>
        </noscript>
        <StartupScreen>{children}</StartupScreen>
      </body>
    </html>
  );
}

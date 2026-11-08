import type { Metadata, Viewport } from "next";
import "glisse/styles.css";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { ToastProvider } from "@/components/Toasts";
import { ConfirmProvider } from "@/components/Confirm";
import AppShell from "@/components/AppShell";
import { DockProvider } from "@/components/Docks";
import { InboxProvider } from "@/lib/inbox";

export const metadata: Metadata = {
  title: "Interact Club Medias - Murder Mystery",
  description: "Înscrieri, punctaj în timp real și stații pentru Interact Club Mediaș - Murder Mystery.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Murder Mystery", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  maximumScale: 1,
  userScalable: false,
  interactiveWidget: "resizes-content",
  themeColor: "#000000",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro" data-theme="light">
      <body>
        <AuthProvider>
          <ToastProvider>
            <ConfirmProvider><DockProvider><InboxProvider><AppShell>{children}</AppShell></InboxProvider></DockProvider></ConfirmProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

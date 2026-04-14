import "./globals.css";
import type { ReactNode } from "react";
import { AppPreferencesProvider } from "../lib/ui-preferences";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="app-body min-h-screen">
        <AppPreferencesProvider>{children}</AppPreferencesProvider>
      </body>
    </html>
  );
}


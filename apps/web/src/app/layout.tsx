import "./globals.css";
import type { ReactNode } from "react";
import { JetBrains_Mono, Noto_Sans_SC } from "next/font/google";

import { WorkspacePreferencesProvider } from "@/lib/workspace-preferences";

const notoSansSc = Noto_Sans_SC({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"]
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono"
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={`${notoSansSc.variable} ${jetbrainsMono.variable}`}>
        <WorkspacePreferencesProvider>{children}</WorkspacePreferencesProvider>
      </body>
    </html>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";

export function MarketingHeader() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-smooth ${isHome ? "glass bg-background/55" : "border-b border-border bg-background/88"}`}>
      <div className="container flex h-16 items-center justify-between">
        <Link className="group flex items-center gap-3" href="/">
          <div className="gradient-bg shadow-glow flex h-9 w-9 items-center justify-center rounded-2xl transition-spring group-hover:scale-105">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">ApiHub</p>
            <p className="text-[11px] tracking-[0.18em] text-muted-foreground">PROJECT WORKBENCH</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link className="text-sm text-muted-foreground transition-fast hover:text-foreground" href="/">
            产品概览
          </Link>
          <Link className="text-sm text-muted-foreground transition-fast hover:text-foreground" href="/login">
            登录入口
          </Link>
          <Link className="text-sm text-muted-foreground transition-fast hover:text-foreground" href="/console">
            选组与项目台
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button size="sm" variant="ghost">
              登录
            </Button>
          </Link>
          <Link href="/console">
            <Button size="sm">
              进入工作台
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

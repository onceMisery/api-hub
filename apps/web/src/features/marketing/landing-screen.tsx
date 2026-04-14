"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Boxes, Bug, Check, FileText, FolderTree, Globe, Palette, Share2, Zap } from "lucide-react";

import { MarketingHeader } from "@/components/layout/marketing-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: FolderTree,
    title: "先选组，再选项目",
    description: "登录后先进入分组工作台，把上下文确认清楚，再进入项目内部菜单。"
  },
  {
    icon: FileText,
    title: "接口列表与文档",
    description: "围绕原型图重做接口浏览体验，目录、详情、版本和发布状态集中呈现。"
  },
  {
    icon: Bug,
    title: "调试与 Mock",
    description: "调试台、Mock 中心和运行地址在统一视觉体系下串起来，协作成本更低。"
  },
  {
    icon: Globe,
    title: "环境编排",
    description: "环境变量、请求头、默认查询参数和调试白名单在一个页面内完整查看。"
  },
  {
    icon: Share2,
    title: "公开分享链路",
    description: "项目内部可管理分享链接，外部访客则直接进入公开文档视图。"
  },
  {
    icon: Palette,
    title: "主题与背景切换",
    description: "支持深浅主题、强调色和背景图切换，适配不同工作氛围。"
  }
];

const highlights = [
  { label: "工作链路", value: "登录 → 选组 → 选项目 → 控制台" },
  { label: "主菜单", value: "接口列表 / 调试台 / 环境 / 版本 / Mock / 分享" },
  { label: "界面特性", value: "主题色切换 + 背景图切换" }
];

export function LandingScreen() {
  return (
    <div className="min-h-screen bg-transparent">
      <MarketingHeader />

      <main>
        <section className="relative overflow-hidden pb-24 pt-28">
          <div className="gradient-hero-bg absolute inset-0" />
          <div className="absolute left-1/2 top-28 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />

          <div className="container relative">
            <motion.div animate={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 20 }} transition={{ duration: 0.45 }}>
              <div className="mx-auto max-w-5xl text-center">
                <Badge className="mb-6">
                  <Zap className="mr-1 h-3 w-3" />
                  按原型图重建中的新前端
                </Badge>
                <h1 className="text-5xl font-bold leading-tight md:text-6xl">
                  让用户先进入上下文
                  <br />
                  <span className="gradient-text">再进入接口和协作动作</span>
                </h1>
                <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
                  新工作台围绕一条明确链路展开：登录后先选组，再选项目，然后进入接口列表、Mock、环境、调试和分享等菜单。
                  视觉上直接参考 `prototype`，不再沿用旧前端的信息结构。
                </p>

                <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                  <Link href="/login">
                    <Button size="xl">
                      进入登录
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/console">
                    <Button size="xl" variant="outline">
                      直接打开项目台
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="mt-16 overflow-hidden rounded-[2.2rem] border border-border bg-card/78 p-4 shadow-elevated">
                <img alt="ApiHub 工作台预览" className="w-full rounded-[1.6rem] border border-border object-cover" loading="lazy" src="/images/hero-illustration.png" />
              </div>
            </motion.div>
          </div>
        </section>

        <section className="border-y border-border bg-card/54 py-14">
          <div className="container grid gap-6 md:grid-cols-3">
            {highlights.map((item) => (
              <div className="rounded-[1.8rem] border border-border bg-card/78 px-6 py-6 text-center shadow-card" key={item.label}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{item.label}</p>
                <p className="mt-4 text-lg font-semibold text-foreground">{item.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="container py-24">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="mb-4" variant="outline">
              功能骨架
            </Badge>
            <h2 className="text-4xl font-bold">高频入口和协作动作全部归位</h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              这套 UI 不再只是“把功能堆进去”，而是先建立清晰的工作路径，再把真实 API 能力接到每个页面里。
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {features.map((feature, index) => (
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                key={feature.title}
                transition={{ delay: index * 0.05 }}
                viewport={{ once: true }}
                whileInView={{ opacity: 1, y: 0 }}
              >
                <Card className="h-full rounded-[1.8rem] border-border/80 bg-card/82 hover:shadow-card-hover">
                  <CardContent className="p-6">
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <feature.icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">{feature.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="gradient-hero-bg py-24">
          <div className="container">
            <div className="rounded-[2.2rem] border border-border bg-card/82 p-10 shadow-elevated">
              <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
                <div>
                  <Badge className="mb-4" variant="outline">
                    设计方向
                  </Badge>
                  <h3 className="text-3xl font-bold">控制台不是堆页面，而是把入口顺序重新排好</h3>
                  <p className="mt-4 text-sm leading-7 text-muted-foreground">
                    旧前端已经整体备份，新的实现直接围绕原型图重建。工作台会始终强调当前项目上下文，让接口浏览、
                    Mock 发布、环境排查和公开分享都在同一套界面语言中完成。
                  </p>
                </div>

                <div className="space-y-4">
                  {[
                    "登录页先把品牌与入口统一下来，避免跳转后断层。",
                    "选组页承担项目分流职责，让用户先决定当前协作上下文。",
                    "项目内侧边导航固定住主菜单，降低切换成本。",
                    "主题色和背景图切换保留，给不同团队保留自定义氛围。"
                  ].map((item) => (
                    <div className="flex items-start gap-3 rounded-[1.5rem] border border-border bg-surface/65 px-4 py-4" key={item}>
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <p className="text-sm leading-6 text-muted-foreground">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-border py-10">
          <div className="container flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground md:flex-row">
            <div className="flex items-center gap-2">
              <div className="gradient-bg flex h-8 w-8 items-center justify-center rounded-xl">
                <Boxes className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-medium text-foreground">ApiHub Frontend Rebuild</span>
            </div>
            <span>当前目标是先把项目台主链路和高优先级页面全部切换到新 UI。</span>
          </div>
        </footer>
      </main>
    </div>
  );
}

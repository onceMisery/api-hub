"use client";

import { useMemo, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Eye, EyeOff, LockKeyhole, ShieldCheck, UserRound, Zap } from "lucide-react";
import { login } from "@api-hub/api-sdk";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { saveTokens } from "@/lib/auth-store";

export function LoginScreen() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => username.trim().length > 0 && password.trim().length > 0, [password, username]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || submitting) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await login({
        username: username.trim(),
        password
      });

      saveTokens(response.data.accessToken, response.data.refreshToken);
      router.replace("/console");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "登录失败，请稍后重试。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-transparent">
      <div className="gradient-hero-bg relative hidden overflow-hidden lg:flex lg:w-[54%] lg:items-center lg:justify-center lg:p-12">
        <div className="absolute inset-0 bg-primary/5" />
        <div className="absolute left-1/3 top-1/3 h-[420px] w-[420px] rounded-full bg-primary/12 blur-[110px]" />

        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="relative max-w-xl"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.45 }}
        >
          <div className="mb-8 flex items-center gap-3">
            <div className="gradient-bg shadow-glow flex h-14 w-14 items-center justify-center rounded-[1.4rem]">
              <Zap className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <p className="text-xl font-semibold text-foreground">ApiHub</p>
              <p className="text-sm text-muted-foreground">从登录开始的新工作台主链路</p>
            </div>
          </div>

          <h1 className="text-5xl font-bold leading-tight">先登录，再选组，再选项目</h1>
          <p className="mt-5 text-base leading-8 text-muted-foreground">
            这是新 UI 的第一步。登录后会先进入项目分组工作台，再进入项目内部的接口列表、Mock、环境、调试和分享页面。
          </p>

          <div className="mt-10 overflow-hidden rounded-[2rem] border border-border bg-card/74 p-4 shadow-elevated">
            <img alt="新工作台主视觉" className="w-full rounded-[1.4rem] border border-border object-cover" src="/images/hero-illustration.png" />
          </div>
        </motion.div>
      </div>

      <div className="flex flex-1 items-center justify-center p-6 lg:p-10">
        <motion.div animate={{ opacity: 1, y: 0 }} className="w-full max-w-md" initial={{ opacity: 0, y: 14 }} transition={{ duration: 0.35 }}>
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="gradient-bg flex h-11 w-11 items-center justify-center rounded-2xl">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">ApiHub</p>
              <p className="text-xs text-muted-foreground">登录进入新的项目工作台</p>
            </div>
          </div>

          <Card className="rounded-[2rem] border-border/80 bg-card/86">
            <CardContent className="p-8">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Workbench Login</p>
                <h2 className="mt-3 text-3xl font-bold">欢迎回来</h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">使用 ApiHub 账号进入新的工作链路。登录成功后会进入“项目组 → 项目”的选择页。</p>
              </div>

              <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">用户名</label>
                  <div className="relative">
                    <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input className="h-11 pl-10" onChange={(event) => setUsername(event.target.value)} placeholder="请输入用户名" value={username} />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">密码</label>
                  <div className="relative">
                    <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="h-11 pl-10 pr-10"
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="请输入密码"
                      type={showPassword ? "text" : "password"}
                      value={password}
                    />
                    <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-fast hover:text-foreground" onClick={() => setShowPassword((value) => !value)} type="button">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error ? <div className="rounded-[1.3rem] border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}

                <Button className="h-11 w-full" disabled={!canSubmit || submitting} type="submit">
                  {submitting ? "登录中..." : "登录并进入工作台"}
                </Button>
              </form>

              <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
                <Link className="transition-fast hover:text-foreground" href="/">
                  返回首页
                </Link>
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  权限与项目上下文会在下一步完成
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

"use client";

import { useId, useRef, useState } from "react";
import { ImagePlus, MonitorCog, Palette, PanelRightClose, PanelRightOpen, SunMoon, Trash2, Wallpaper } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useWorkspacePreferences, type WorkspaceAccent, type WorkspaceTheme } from "@/lib/workspace-preferences";

const themes: Array<{ id: WorkspaceTheme; label: string; hint: string }> = [
  { id: "dark", label: "深色", hint: "适合长时间编辑与调试" },
  { id: "light", label: "浅色", hint: "适合阅读与评审场景" },
];

const accents: Array<{ id: WorkspaceAccent; label: string; preview: string }> = [
  { id: "violet", label: "星夜紫", preview: "from-violet-500 to-sky-500" },
  { id: "emerald", label: "松石绿", preview: "from-emerald-500 to-cyan-500" },
  { id: "cyan", label: "海岸蓝", preview: "from-cyan-500 to-sky-500" },
  { id: "amber", label: "琥珀橙", preview: "from-amber-500 to-orange-500" },
  { id: "rose", label: "雾玫红", preview: "from-rose-500 to-fuchsia-500" },
];

type ThemeCustomizerProps = {
  className?: string;
  compact?: boolean;
  onToggle: () => void;
  open: boolean;
};

export function ThemeCustomizer({ className, compact = false, onToggle, open }: ThemeCustomizerProps) {
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const {
    accent,
    backgroundImageUrl,
    backgroundMode,
    clearBackgroundImage,
    setAccent,
    setBackgroundImageUrl,
    setBackgroundMode,
    setTheme,
    theme,
  } = useWorkspacePreferences();

  async function handleFileSelect(file: File | null) {
    if (!file) {
      return;
    }
    if (!file.type.startsWith("image/")) {
      setUploadError("请选择图片文件");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setUploadError("图片需小于 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setBackgroundImageUrl(typeof reader.result === "string" ? reader.result : "");
      setUploadError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };
    reader.onerror = () => {
      setUploadError("背景图读取失败，请重试");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className={cn("relative z-[80] shrink-0", className)}>
      <Button onClick={onToggle} size={compact ? "icon-sm" : "sm"} variant="outline">
        {open ? <PanelRightClose className="h-3.5 w-3.5" /> : <PanelRightOpen className="h-3.5 w-3.5" />}
        {compact ? null : <span className="ml-1.5">外观</span>}
      </Button>

      {open ? (
        <>
          <button
            aria-label="关闭外观面板"
            className="fixed inset-0 z-[70] bg-background/22"
            onClick={onToggle}
            type="button"
          />

          <div className="absolute right-0 top-full z-[81] mt-3 w-[420px] max-w-[calc(100vw-24px)] overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-[0_28px_72px_hsl(225_35%_10%_/_0.18)]">
            <div className="border-b border-border bg-card px-5 py-5">
              <div className="flex items-start gap-3">
                <div className="gradient-bg flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-glow">
                  <MonitorCog className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">控制台外观</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">紧凑浮层设置，不改变顶部布局。</p>
                </div>
              </div>
            </div>

            <div className="scrollbar-thin max-h-[min(82vh,820px)] space-y-4 overflow-y-auto bg-card px-5 py-5">
              <section className="rounded-[1.3rem] border border-border bg-background px-4 py-4">
                <p className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  <SunMoon className="h-3.5 w-3.5" />
                  明暗模式
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {themes.map((item) => (
                    <button
                      className={cn(
                        "cursor-pointer rounded-[1.1rem] border px-4 py-4 text-left transition-smooth",
                        theme === item.id ? "border-primary/35 bg-primary/10" : "border-border bg-card hover:border-primary/20",
                      )}
                      key={item.id}
                      onClick={() => setTheme(item.id)}
                      type="button"
                    >
                      <p className="text-sm font-semibold text-foreground">{item.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p>
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-[1.3rem] border border-border bg-background px-4 py-4">
                <p className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  <Palette className="h-3.5 w-3.5" />
                  主题色
                </p>
                <div className="grid grid-cols-5 gap-3">
                  {accents.map((item) => (
                    <button
                      aria-label={item.label}
                      className={cn(
                        "cursor-pointer rounded-[1.05rem] border px-2 py-3 transition-smooth",
                        accent === item.id ? "border-primary/35 bg-primary/10" : "border-border bg-card hover:border-primary/20",
                      )}
                      key={item.id}
                      onClick={() => setAccent(item.id)}
                      type="button"
                    >
                      <span className={`mx-auto block h-8 w-8 rounded-full bg-gradient-to-br ${item.preview}`} />
                      <span className="mt-2 block text-center text-[10px] text-muted-foreground">{item.label}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-[1.3rem] border border-border bg-background px-4 py-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    <Wallpaper className="h-3.5 w-3.5" />
                    背景图
                  </p>
                  {backgroundMode === "upload" && backgroundImageUrl ? (
                    <Button
                      onClick={() => {
                        clearBackgroundImage();
                        setUploadError(null);
                      }}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      清除
                    </Button>
                  ) : null}
                </div>

                <div className="space-y-3">
                  <button
                    className={cn(
                      "block w-full cursor-pointer rounded-[1.1rem] border px-4 py-4 text-left transition-smooth",
                      backgroundMode === "none" ? "border-primary/35 bg-primary/10" : "border-border bg-card hover:border-primary/20",
                    )}
                    onClick={() => setBackgroundMode("none")}
                    type="button"
                  >
                    <p className="text-sm font-semibold text-foreground">纯净背景</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">关闭背景图，仅保留轻量氛围层。</p>
                  </button>

                  <label className="block cursor-pointer rounded-[1.1rem] border border-dashed border-border bg-card px-4 py-4 transition-smooth hover:border-primary/20">
                    <input
                      accept="image/*"
                      className="hidden"
                      id={fileInputId}
                      onChange={(event) => void handleFileSelect(event.target.files?.[0] ?? null)}
                      ref={fileInputRef}
                      type="file"
                    />
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="gradient-bg flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
                          <ImagePlus className="h-4 w-4 text-primary-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">上传自定义背景图</p>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">推荐横向图片，单张不超过 2MB。</p>
                        </div>
                      </div>
                      <Button
                        onClick={(event) => {
                          event.preventDefault();
                          if (fileInputRef.current) {
                            fileInputRef.current.value = "";
                          }
                          fileInputRef.current?.click();
                        }}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        选择
                      </Button>
                    </div>
                  </label>

                  {backgroundMode === "upload" && backgroundImageUrl ? (
                    <div className="overflow-hidden rounded-[1.1rem] border border-border bg-card">
                      <div className="h-36 w-full bg-cover bg-center" style={{ backgroundImage: `url(${backgroundImageUrl})` }} />
                      <div className="px-4 py-4">
                        <div>
                          <p className="text-sm font-semibold text-foreground">当前背景图</p>
                          <p className="mt-1 text-xs text-muted-foreground">已启用，可继续替换。</p>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {uploadError ? (
                    <div className="rounded-[0.9rem] border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                      {uploadError}
                    </div>
                  ) : null}
                </div>
              </section>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MarketingHeader } from '@/components/layout/MarketingHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  FileText, Zap, Shield, GitBranch, Bug, Box,
  Globe, ArrowRight, Check, Sparkles
} from 'lucide-react'

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
}

const stagger = {
  animate: { transition: { staggerChildren: 0.1 } }
}

const features = [
  {
    icon: FileText, title: '接口文档管理',
    desc: '卡片式文档编辑器，支持参数树、响应结构、Schema 可视化，告别传统表单堆叠',
    image: '/images/feature-docs.png',
  },
  {
    icon: Bug, title: '在线调试',
    desc: '内置请求构建器与响应查看器，支持环境变量替换，调试历史自动保存',
    image: null,
  },
  {
    icon: Box, title: 'Mock 服务',
    desc: '规则化 Mock 配置，条件匹配与优先级排序，一键发布即可联调使用',
    image: null,
  },
  {
    icon: GitBranch, title: '版本管理',
    desc: '接口快照与发布流程，版本 Diff 对比，支持回滚与模块级版本标签',
    image: null,
  },
  {
    icon: Globe, title: '环境管理',
    desc: '多环境变量配置，密钥安全存储，调试与 Mock 无缝切换',
    image: null,
  },
  {
    icon: Shield, title: '权限体系',
    desc: '空间、项目、成员三级权限，支持角色继承与覆盖，保障团队协作安全',
    image: null,
  },
]

const stats = [
  { value: '99.9%', label: '可用性保障' },
  { value: '<50ms', label: '接口响应时间' },
  { value: '10K+', label: '团队信赖' },
  { value: '∞', label: 'API 数量不限' },
]

function HeroSection() {
  return (
    <section className="relative pt-32 pb-20 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 gradient-hero-bg" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px] animate-glow-pulse" />

      <div className="container mx-auto px-6 relative">
        <motion.div className="max-w-4xl mx-auto text-center" {...stagger} initial="initial" animate="animate">
          <motion.div {...fadeIn}>
            <Badge className="mb-6">
              <Sparkles className="w-3 h-3 mr-1" /> 全新设计 · MySQL 单机优先
            </Badge>
          </motion.div>

          <motion.h1 {...fadeIn} className="text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
            现代化的 API<br />
            <span className="gradient-text">文档管理平台</span>
          </motion.h1>

          <motion.p {...fadeIn} className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            ApiHub 为研发团队提供接口文档编辑、版本管理、在线调试、Mock 服务的一站式解决方案。
            卡片式交互设计，双模式 UI，让 API 管理回归简单与优雅。
          </motion.p>

          <motion.div {...fadeIn} className="flex items-center justify-center gap-4">
            <Link to="/console">
              <Button size="xl" className="group">
                免费开始使用
                <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link to="/docs">
              <Button variant="outline" size="xl">查看文档</Button>
            </Link>
          </motion.div>

          {/* Hero image */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="mt-16 relative"
          >
            <div className="absolute inset-0 gradient-bg rounded-2xl opacity-10 blur-3xl" />
            <img
              src="/images/hero-illustration.png"
              alt="ApiHub 平台概览"
              className="w-full rounded-2xl border border-border shadow-elevated relative z-10"
              loading="lazy"
            />
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

function StatsSection() {
  return (
    <section className="py-16 border-y border-border bg-card/50">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <div className="text-3xl font-bold gradient-text mb-1">{s.value}</div>
              <div className="text-sm text-muted-foreground">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function FeaturesSection() {
  return (
    <section className="py-24">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <Badge variant="outline" className="mb-4">核心功能</Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            为研发团队打造的<span className="gradient-text">全流程工具</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            从文档编写到调试测试，从版本管理到 Mock 联调，覆盖 API 生命周期每个环节
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <Card className="group hover:shadow-card-hover hover:border-primary/20 h-full">
                <CardContent className="p-6">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4 transition-smooth group-hover:bg-primary/15 group-hover:scale-105">
                    <f.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                  {f.image && (
                    <img src={f.image} alt={f.title} className="mt-4 rounded-lg border border-border w-full h-32 object-cover opacity-80 group-hover:opacity-100 transition-smooth" loading="lazy" />
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function DualModeSection() {
  return (
    <section className="py-24 gradient-hero-bg">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <Badge variant="outline" className="mb-4">双模式 UI</Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            管理模式 + 浏览模式
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            编辑时高效紧凑，阅读时清爽专注。一键切换，两种体验
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {[
            { title: '管理模式', desc: '编辑视图', items: ['卡片化工作台布局', '吸附式工具栏', '快速编辑面板', '高信息密度导航'], color: 'primary' },
            { title: '浏览模式', desc: '纯净阅读', items: ['简洁文档排版', '参数表格清晰展示', '响应示例高亮', '无干扰阅读体验'], color: 'info' },
          ].map((mode, i) => (
            <motion.div
              key={mode.title}
              initial={{ opacity: 0, x: i === 0 ? -20 : 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <Card className="h-full hover:shadow-card-hover">
                <CardContent className="p-8">
                  <Badge variant={mode.color === 'primary' ? 'default' : 'info'} className="mb-4">{mode.desc}</Badge>
                  <h3 className="text-xl font-semibold text-foreground mb-4">{mode.title}</h3>
                  <ul className="space-y-3">
                    {mode.items.map(item => (
                      <li key={item} className="flex items-center gap-3 text-sm text-muted-foreground">
                        <Check className="w-4 h-4 text-primary shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CTASection() {
  return (
    <section className="py-24">
      <div className="container mx-auto px-6">
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 gradient-bg opacity-5" />
          <CardContent className="relative p-12 md:p-16 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              开始使用 ApiHub
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-8">
              单机部署，开箱即用。仅需 MySQL 即可运行全部功能。
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link to="/console">
                <Button size="lg">
                  免费开始 <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link to="/docs">
                <Button variant="outline" size="lg">查看文档</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-border py-12">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded gradient-bg flex items-center justify-center">
              <Zap className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold text-foreground">ApiHub</span>
          </div>
          <p className="text-xs text-muted-foreground">
            MySQL 单机优先 · Next.js 15 + Spring Boot 3.2 · 开源 API 文档管理平台
          </p>
        </div>
      </div>
    </footer>
  )
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingHeader />
      <main>
        <HeroSection />
        <StatsSection />
        <FeaturesSection />
        <DualModeSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}

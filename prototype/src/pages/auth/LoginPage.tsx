import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Zap, Eye, EyeOff, Github, Mail } from 'lucide-react'

export function LoginPage() {
  const [isRegister, setIsRegister] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left - Branding panel */}
      <div className="hidden lg:flex lg:w-1/2 gradient-hero-bg relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 bg-primary/3" />
        <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] rounded-full bg-primary/5 blur-[100px] animate-glow-pulse" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative text-center max-w-md"
        >
          <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-8 shadow-glow">
            <Zap className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-4">ApiHub</h1>
          <p className="text-muted-foreground leading-relaxed">
            现代化的 API 文档管理与协作平台，支持接口编辑、版本管理、调试与 Mock 服务
          </p>
          <div className="mt-12 flex items-center justify-center gap-6 text-xs text-muted-foreground">
            <span>接口管理</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span>在线调试</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span>Mock 服务</span>
          </div>
        </motion.div>
      </div>

      {/* Right - Form panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground">ApiHub</span>
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-2">
            {isRegister ? '创建账号' : '欢迎回来'}
          </h2>
          <p className="text-sm text-muted-foreground mb-8">
            {isRegister ? '注册以开始管理你的 API 文档' : '登录你的 ApiHub 账号'}
          </p>

          {/* OAuth buttons */}
          <div className="flex gap-3 mb-6">
            <Button variant="outline" className="flex-1 h-11">
              <Github className="w-4 h-4 mr-2" /> GitHub
            </Button>
            <Button variant="outline" className="flex-1 h-11">
              <Mail className="w-4 h-4 mr-2" /> 邮箱
            </Button>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-background text-muted-foreground">或使用密码</span>
            </div>
          </div>

          <form className="space-y-4" onSubmit={e => e.preventDefault()}>
            {isRegister && (
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">用户名</label>
                <Input placeholder="输入你的用户名" />
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">邮箱地址</label>
              <Input type="email" placeholder="name@example.com" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">密码</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="输入密码"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-fast"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Link to="/console">
              <Button className="w-full h-11 mt-2" type="submit">
                {isRegister ? '注册' : '登录'}
              </Button>
            </Link>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {isRegister ? '已有账号？' : '还没有账号？'}
            <button
              onClick={() => setIsRegister(!isRegister)}
              className="text-primary font-medium ml-1 hover:underline"
            >
              {isRegister ? '立即登录' : '免费注册'}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  )
}

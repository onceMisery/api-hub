import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  Zap, LayoutDashboard, FileText, Bug, Globe, GitBranch,
  Box, ChevronDown, ChevronRight, Settings, Search, Bell,
  Plus, FolderOpen, ChevronsLeft, ChevronsRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const sidebarItems = [
  { icon: LayoutDashboard, label: '工作台', path: '/console' },
  { icon: FileText, label: 'API 文档', path: '/console/api-editor' },
  { icon: Bug, label: '调试面板', path: '/console/debug' },
  { icon: Globe, label: '环境管理', path: '/console/environments' },
  { icon: GitBranch, label: '版本管理', path: '/console/versions' },
  { icon: Box, label: 'Mock 服务', path: '/console/mock' },
]

interface ConsoleSidebarProps {
  collapsed: boolean
  onToggle: () => void
}

function ConsoleSidebar({ collapsed, onToggle }: ConsoleSidebarProps) {
  const location = useLocation()
  const [projectOpen, setProjectOpen] = useState(true)

  return (
    <aside className={cn(
      "h-screen border-r border-border bg-card flex flex-col transition-smooth overflow-hidden",
      collapsed ? "w-16" : "w-60"
    )}>
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-border gap-2.5 shrink-0">
        <div className="w-7 h-7 rounded-lg gradient-bg flex items-center justify-center shrink-0">
          <Zap className="w-3.5 h-3.5 text-primary-foreground" />
        </div>
        {!collapsed && <span className="text-sm font-bold text-foreground">ApiHub</span>}
      </div>

      {/* Project selector */}
      {!collapsed && (
        <div className="px-3 py-3 border-b border-border">
          <button
            onClick={() => setProjectOpen(!projectOpen)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-accent text-sm transition-fast"
          >
            <FolderOpen className="w-4 h-4 text-primary shrink-0" />
            <span className="truncate font-medium text-foreground">电商平台 API</span>
            {projectOpen ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-auto" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground ml-auto" />}
          </button>
          {projectOpen && (
            <div className="mt-1 ml-4 space-y-0.5">
              {['用户模块', '商品模块', '订单模块', '支付模块'].map(m => (
                <div key={m} className="flex items-center gap-2 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 cursor-pointer transition-fast">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                  {m}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto scrollbar-thin">
        {sidebarItems.map(item => {
          const isActive = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 rounded-lg transition-fast",
                collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <item.icon className={cn("shrink-0", collapsed ? "w-5 h-5" : "w-4 h-4")} />
              {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="px-2 py-3 border-t border-border">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-fast"
        >
          {collapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  )
}

function ConsoleTopBar() {
  return (
    <header className="h-14 border-b border-border bg-card/50 glass flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-3 flex-1">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="搜索接口、文档、项目..." className="pl-9 h-9 bg-background/50" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon-sm" className="text-muted-foreground">
          <Bell className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" className="text-muted-foreground">
          <Settings className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" className="text-muted-foreground">
          <Plus className="w-4 h-4" />
        </Button>
        <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-xs font-bold text-primary-foreground ml-2 cursor-pointer">
          M
        </div>
      </div>
    </header>
  )
}

export function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <ConsoleSidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <ConsoleTopBar />
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          {children}
        </main>
      </div>
    </div>
  )
}

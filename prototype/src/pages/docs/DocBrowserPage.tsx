import { useState } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge, MethodBadge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Zap, Search, ChevronRight, ChevronDown, ExternalLink,
  Copy, BookOpen, FileText, FolderOpen, Menu, X
} from 'lucide-react'

const apiTree = [
  {
    module: '用户模块',
    groups: [
      {
        name: '认证',
        endpoints: [
          { method: 'POST', path: '/auth/login', title: '用户登录' },
          { method: 'POST', path: '/auth/register', title: '用户注册' },
          { method: 'POST', path: '/auth/refresh', title: '刷新令牌' },
          { method: 'GET', path: '/auth/me', title: '当前用户信息' },
        ]
      },
      {
        name: '用户管理',
        endpoints: [
          { method: 'GET', path: '/users', title: '用户列表' },
          { method: 'GET', path: '/users/:id', title: '用户详情' },
          { method: 'PUT', path: '/users/:id', title: '更新用户' },
        ]
      }
    ]
  },
  {
    module: '商品模块',
    groups: [
      {
        name: '商品',
        endpoints: [
          { method: 'GET', path: '/products', title: '商品列表' },
          { method: 'POST', path: '/products', title: '创建商品' },
          { method: 'GET', path: '/products/:id', title: '商品详情' },
          { method: 'PUT', path: '/products/:id', title: '更新商品' },
          { method: 'DELETE', path: '/products/:id', title: '删除商品' },
        ]
      }
    ]
  },
]

const sampleEndpoint = {
  method: 'POST',
  path: '/auth/login',
  title: '用户登录',
  desc: '通过邮箱和密码登录，返回访问令牌和刷新令牌。令牌有效期 2 小时。',
  params: [
    { name: 'email', type: 'string', required: true, desc: '用户邮箱地址' },
    { name: 'password', type: 'string', required: true, desc: '用户密码，最少 8 位' },
    { name: 'remember', type: 'boolean', required: false, desc: '是否延长令牌有效期' },
  ],
  response: `{
  "code": 200,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
    "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2g...",
    "expiresIn": 7200,
    "user": {
      "id": "usr_01H8X3Y...",
      "email": "dev@apihub.com",
      "name": "开发者",
      "role": "admin"
    }
  }
}`,
}

function DocSidebar({ mobileOpen, onClose }: { mobileOpen: boolean, onClose: () => void }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ '用户模块': true, '认证': true })

  const toggle = (key: string) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }))

  return (
    <aside className={cn(
      "w-72 border-r border-border bg-card h-screen flex flex-col",
      "fixed lg:relative z-40 transition-smooth",
      mobileOpen ? "left-0" : "-left-72 lg:left-0"
    )}>
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-border shrink-0">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg gradient-bg flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <span className="text-sm font-bold text-foreground">ApiHub</span>
        </Link>
        <button onClick={onClose} className="lg:hidden text-muted-foreground">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="搜索接口..." className="pl-8 h-8 text-xs" />
        </div>
      </div>

      {/* Project info */}
      <div className="px-4 py-3 border-b border-border">
        <div className="text-xs text-muted-foreground mb-0.5">电商平台 API</div>
        <div className="flex items-center gap-2">
          <Badge variant="success" className="text-2xs">v2.3.0</Badge>
          <span className="text-2xs text-muted-foreground">已发布</span>
        </div>
      </div>

      {/* Tree */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-2">
        {apiTree.map(mod => (
          <div key={mod.module}>
            <button
              onClick={() => toggle(mod.module)}
              className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-fast"
            >
              {expanded[mod.module] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              <FolderOpen className="w-3.5 h-3.5" />
              {mod.module}
            </button>
            {expanded[mod.module] && mod.groups.map(grp => (
              <div key={grp.name} className="ml-4">
                <button
                  onClick={() => toggle(grp.name)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-fast"
                >
                  {expanded[grp.name] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  {grp.name}
                </button>
                {expanded[grp.name] && (
                  <div className="ml-4 space-y-0.5 mb-1">
                    {grp.endpoints.map(ep => (
                      <button
                        key={ep.path}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-fast text-left",
                          ep.path === '/auth/login'
                            ? "bg-primary/10 text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        )}
                      >
                        <MethodBadge method={ep.method} />
                        <span className="truncate">{ep.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  )
}

function DocContent() {
  const ep = sampleEndpoint
  return (
    <div className="max-w-4xl mx-auto px-6 lg:px-10 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-6">
        <span>电商平台 API</span>
        <ChevronRight className="w-3 h-3" />
        <span>用户模块</span>
        <ChevronRight className="w-3 h-3" />
        <span>认证</span>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground">{ep.title}</span>
      </div>

      {/* Title */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <MethodBadge method={ep.method} />
            <code className="text-sm font-mono text-muted-foreground">{ep.path}</code>
            <button className="text-muted-foreground hover:text-foreground transition-fast">
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
          <h1 className="text-2xl font-bold text-foreground">{ep.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="success">已发布</Badge>
          <Button variant="outline" size="sm">
            <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
            分享
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed mb-8">{ep.desc}</p>

      {/* Request params */}
      <section className="mb-8">
        <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          请求参数
        </h2>
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">参数名</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">类型</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">必填</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">说明</th>
              </tr>
            </thead>
            <tbody>
              {ep.params.map(p => (
                <tr key={p.name} className="border-b border-border last:border-0 hover:bg-accent/30 transition-fast">
                  <td className="px-4 py-3 font-mono text-xs text-foreground">{p.name}</td>
                  <td className="px-4 py-3"><Badge variant="outline">{p.type}</Badge></td>
                  <td className="px-4 py-3">
                    {p.required ? <Badge variant="destructive">必填</Badge> : <span className="text-muted-foreground text-xs">可选</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{p.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Response example */}
      <section>
        <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          响应示例
        </h2>
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-surface border-b border-border">
            <div className="flex items-center gap-2">
              <Badge variant="success">200</Badge>
              <span className="text-xs text-muted-foreground">application/json</span>
            </div>
            <button className="text-muted-foreground hover:text-foreground transition-fast">
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
          <pre className="p-4 text-xs font-mono text-foreground overflow-x-auto bg-surface/50 leading-relaxed">
            {ep.response}
          </pre>
        </div>
      </section>
    </div>
  )
}

export function DocBrowserPage() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background flex">
      {mobileOpen && <div className="fixed inset-0 bg-background/80 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />}
      <DocSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex-1 min-w-0">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center gap-3 h-14 px-4 border-b border-border bg-card">
          <button onClick={() => setMobileOpen(true)} className="text-muted-foreground">
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium text-foreground">用户登录</span>
        </div>
        <DocContent />
      </div>
    </div>
  )
}

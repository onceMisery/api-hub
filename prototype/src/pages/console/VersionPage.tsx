import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ConsoleLayout } from '@/components/layout/ConsoleLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge, MethodBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  GitBranch, Tag, Clock, User, ArrowRight,
  ChevronRight, Eye, RotateCcw, Diff, CheckCircle2, Upload
} from 'lucide-react'

const versions = [
  {
    id: 'v2.3.0',
    status: 'published',
    date: '2026-04-06 14:30',
    author: '张三',
    changes: 12,
    desc: '新增支付模块接口，优化订单创建流程',
  },
  {
    id: 'v2.2.1',
    status: 'published',
    date: '2026-03-28 10:15',
    author: '李四',
    changes: 5,
    desc: '修复用户认证令牌刷新问题',
  },
  {
    id: 'v2.2.0',
    status: 'published',
    date: '2026-03-20 16:45',
    author: '张三',
    changes: 23,
    desc: '商品搜索接口重构，支持多条件过滤',
  },
  {
    id: 'v2.1.0',
    status: 'published',
    date: '2026-03-10 09:30',
    author: '王五',
    changes: 18,
    desc: '新增购物车模块，支持批量操作',
  },
  {
    id: 'v2.0.0',
    status: 'published',
    date: '2026-02-25 11:00',
    author: '张三',
    changes: 45,
    desc: 'V2 大版本升级，全面重构接口规范',
  },
]

const diffItems = [
  { method: 'POST', path: '/payments/create', type: 'added', title: '创建支付单' },
  { method: 'GET', path: '/payments/:id', type: 'added', title: '查询支付单' },
  { method: 'POST', path: '/payments/:id/refund', type: 'added', title: '申请退款' },
  { method: 'POST', path: '/orders/create', type: 'modified', title: '创建订单' },
  { method: 'GET', path: '/orders/:id', type: 'modified', title: '订单详情' },
  { method: 'DELETE', path: '/orders/:id/cancel', type: 'deprecated', title: '取消订单（旧）' },
]

const moduleVersions = [
  { module: '用户模块', version: 'v2.3.0', apis: 12, status: 'published' },
  { module: '商品模块', version: 'v2.3.0', apis: 18, status: 'published' },
  { module: '订单模块', version: 'v2.3.0', apis: 15, status: 'published' },
  { module: '支付模块', version: 'v2.3.0', apis: 8, status: 'draft' },
]

export function VersionPage() {
  const [selectedVersion, setSelectedVersion] = useState('v2.3.0')
  const [showDiff, setShowDiff] = useState(false)

  return (
    <ConsoleLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">版本管理</h1>
            <p className="text-sm text-muted-foreground mt-1">管理接口文档版本、快照与发布记录</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowDiff(!showDiff)}>
              <Diff className="w-3.5 h-3.5 mr-1.5" /> 版本对比
            </Button>
            <Button size="sm">
              <Upload className="w-3.5 h-3.5 mr-1.5" /> 发布新版本
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Version timeline */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <GitBranch className="w-4 h-4 text-primary" />
                  版本历史
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {versions.map((v, i) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVersion(v.id)}
                      className={cn(
                        "w-full text-left px-4 py-3 transition-fast",
                        selectedVersion === v.id ? "bg-primary/5" : "hover:bg-accent/50"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Tag className="w-3.5 h-3.5 text-primary" />
                          <span className="text-sm font-semibold text-foreground">{v.id}</span>
                        </div>
                        {i === 0 && <Badge variant="success" className="text-2xs">最新</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mb-1.5 line-clamp-1">{v.desc}</p>
                      <div className="flex items-center gap-3 text-2xs text-muted-foreground">
                        <span className="flex items-center gap-1"><User className="w-3 h-3" /> {v.author}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {v.date}</span>
                        <Badge variant="outline" className="text-2xs">{v.changes} 项变更</Badge>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Version detail / Diff */}
          <div className="lg:col-span-2 space-y-6">
            {showDiff ? (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Diff className="w-4 h-4 text-primary" />
                      版本对比
                    </CardTitle>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline">v2.2.1</Badge>
                      <ArrowRight className="w-3.5 h-3.5" />
                      <Badge variant="default">v2.3.0</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {diffItems.map(d => (
                      <div key={d.path} className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/30 transition-fast">
                        <Badge
                          variant={d.type === 'added' ? 'success' : d.type === 'modified' ? 'warning' : 'destructive'}
                          className="text-2xs w-14 justify-center"
                        >
                          {d.type === 'added' ? '新增' : d.type === 'modified' ? '修改' : '废弃'}
                        </Badge>
                        <MethodBadge method={d.method} />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-medium text-foreground">{d.title}</span>
                          <span className="text-xs font-mono text-muted-foreground ml-2">{d.path}</span>
                        </div>
                        <Button variant="ghost" size="icon-sm" className="text-muted-foreground">
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Version info */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h2 className="text-xl font-bold text-foreground">{selectedVersion}</h2>
                          <Badge variant="success">已发布</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {versions.find(v => v.id === selectedVersion)?.desc}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" className="text-xs">
                        <RotateCcw className="w-3 h-3 mr-1" /> 回滚到此版本
                      </Button>
                    </div>
                    <div className="flex items-center gap-6 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        {versions.find(v => v.id === selectedVersion)?.author}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {versions.find(v => v.id === selectedVersion)?.date}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                        {versions.find(v => v.id === selectedVersion)?.changes} 项变更
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Module versions */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">模块版本标签</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border bg-surface">
                          <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider">模块</th>
                          <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider">版本</th>
                          <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider">接口数</th>
                          <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider">状态</th>
                        </tr>
                      </thead>
                      <tbody>
                        {moduleVersions.map(m => (
                          <tr key={m.module} className="border-b border-border last:border-0 hover:bg-accent/30 transition-fast">
                            <td className="px-4 py-3 font-medium text-foreground">{m.module}</td>
                            <td className="px-4 py-3 font-mono text-muted-foreground">{m.version}</td>
                            <td className="px-4 py-3 text-muted-foreground">{m.apis}</td>
                            <td className="px-4 py-3">
                              <Badge variant={m.status === 'published' ? 'success' : 'warning'} className="text-2xs">
                                {m.status === 'published' ? '已发布' : '草稿'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </ConsoleLayout>
  )
}

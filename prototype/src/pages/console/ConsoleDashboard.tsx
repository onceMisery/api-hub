import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { ConsoleLayout } from '@/components/layout/ConsoleLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge, MethodBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  FileText, Bug, Box, GitBranch, Plus, ArrowUpRight,
  Clock, Users, Activity, TrendingUp, FolderOpen
} from 'lucide-react'

const stats = [
  { label: '接口总数', value: '142', icon: FileText, trend: '+12', iconClass: 'bg-primary/10 text-primary' },
  { label: '本周调试', value: '328', icon: Bug, trend: '+45', iconClass: 'bg-success/10 text-success' },
  { label: 'Mock 服务', value: '23', icon: Box, trend: '+3', iconClass: 'bg-warning/10 text-warning' },
  { label: '团队成员', value: '8', icon: Users, trend: '+1', iconClass: 'bg-info/10 text-info' },
]

const recentApis = [
  { method: 'POST', path: '/orders/create', title: '创建订单', time: '10 分钟前', status: '草稿' },
  { method: 'GET', path: '/products/search', title: '搜索商品', time: '1 小时前', status: '已发布' },
  { method: 'PUT', path: '/users/:id/profile', title: '更新用户资料', time: '3 小时前', status: '已发布' },
  { method: 'DELETE', path: '/cart/:id', title: '清空购物车', time: '5 小时前', status: '草稿' },
  { method: 'GET', path: '/payments/:id/status', title: '查询支付状态', time: '昨天', status: '已发布' },
]

const projects = [
  { name: '电商平台 API', apis: 86, members: 5, status: 'active' },
  { name: '内容管理系统', apis: 34, members: 3, status: 'active' },
  { name: '数据分析平台', apis: 22, members: 4, status: 'draft' },
]

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 }
}

export function ConsoleDashboard() {
  return (
    <ConsoleLayout>
      <div className="p-6 space-y-6">
        {/* Welcome */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">工作台</h1>
            <p className="text-sm text-muted-foreground mt-1">欢迎回来，查看最新的 API 动态</p>
          </div>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-1.5" /> 新建接口
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <motion.div key={s.label} {...fadeIn} transition={{ delay: i * 0.05 }}>
              <Card className="hover:shadow-card-hover">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", s.iconClass)}>
                      <s.icon className="w-4 h-4" />
                    </div>
                    <Badge variant="success" className="text-2xs">
                      <TrendingUp className="w-3 h-3 mr-0.5" /> {s.trend}
                    </Badge>
                  </div>
                  <div className="text-2xl font-bold text-foreground">{s.value}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent APIs */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Activity className="w-4 h-4 text-primary" />
                    最近更新的接口
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                    查看全部 <ArrowUpRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {recentApis.map((api) => (
                    <div
                      key={api.path}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/50 transition-fast cursor-pointer group"
                    >
                      <MethodBadge method={api.method} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{api.title}</div>
                        <div className="text-xs text-muted-foreground font-mono truncate">{api.path}</div>
                      </div>
                      <Badge variant={api.status === '已发布' ? 'success' : 'outline'} className="shrink-0 text-2xs">
                        {api.status}
                      </Badge>
                      <div className="flex items-center gap-1 text-2xs text-muted-foreground shrink-0">
                        <Clock className="w-3 h-3" />
                        {api.time}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Projects */}
          <div>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FolderOpen className="w-4 h-4 text-primary" />
                    项目列表
                  </CardTitle>
                  <Button variant="ghost" size="icon-sm" className="text-muted-foreground">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {projects.map(p => (
                    <div key={p.name} className="p-3 rounded-lg border border-border hover:border-primary/20 hover:shadow-card transition-smooth cursor-pointer">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-foreground">{p.name}</span>
                        <Badge variant={p.status === 'active' ? 'success' : 'outline'} className="text-2xs">
                          {p.status === 'active' ? '活跃' : '草稿'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" /> {p.apis} 个接口
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" /> {p.members} 人
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ConsoleLayout>
  )
}

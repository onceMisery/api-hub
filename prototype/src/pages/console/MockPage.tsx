import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ConsoleLayout } from '@/components/layout/ConsoleLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge, MethodBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Textarea, Select } from '@/components/ui/input'
import {
  Box, Plus, Pencil, Trash2, Play, Pause,
  Upload, Copy, Settings2, ArrowRight,
  GripVertical, ChevronDown, CheckCircle2, Globe
} from 'lucide-react'

const mockRules = [
  {
    id: 1,
    method: 'POST',
    path: '/auth/login',
    name: '用户登录 Mock',
    status: 'active',
    priority: 1,
    condition: 'email == "admin@apihub.com"',
    responseCode: 200,
    responseBody: '{"code":200,"data":{"accessToken":"mock_token","user":{"name":"Admin"}}}',
    delay: 100,
    hits: 234,
  },
  {
    id: 2,
    method: 'POST',
    path: '/auth/login',
    name: '登录失败 Mock',
    status: 'active',
    priority: 2,
    condition: '默认匹配',
    responseCode: 401,
    responseBody: '{"code":401,"message":"用户名或密码错误"}',
    delay: 50,
    hits: 56,
  },
  {
    id: 3,
    method: 'GET',
    path: '/products',
    name: '商品列表 Mock',
    status: 'active',
    priority: 1,
    condition: '无条件',
    responseCode: 200,
    responseBody: '{"code":200,"data":{"items":[{"id":1,"name":"iPhone 16"},{"id":2,"name":"MacBook Pro"}],"total":2}}',
    delay: 200,
    hits: 1023,
  },
  {
    id: 4,
    method: 'POST',
    path: '/orders/create',
    name: '创建订单 Mock',
    status: 'inactive',
    priority: 1,
    condition: '无条件',
    responseCode: 200,
    responseBody: '{"code":200,"data":{"orderId":"ord_123456"}}',
    delay: 150,
    hits: 0,
  },
]

const mockStats = [
  { label: '活跃规则', value: '3', change: '+1' },
  { label: '今日命中', value: '1,313', change: '+189' },
  { label: 'Mock 地址', value: '12', change: '+3' },
  { label: '平均延迟', value: '125ms', change: '-15ms' },
]

export function MockPage() {
  const [selectedRule, setSelectedRule] = useState<number | null>(1)
  const currentRule = mockRules.find(r => r.id === selectedRule)

  return (
    <ConsoleLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Mock 服务</h1>
            <p className="text-sm text-muted-foreground mt-1">管理 Mock 规则、发布与运行时匹配</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Upload className="w-3.5 h-3.5 mr-1.5" /> 发布 Mock
            </Button>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1.5" /> 新建规则
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {mockStats.map(s => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground mb-1">{s.label}</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-foreground">{s.value}</span>
                  <span className="text-2xs text-success">{s.change}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Mock URL banner */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-primary" />
              <div>
                <div className="text-xs text-muted-foreground">Mock 服务地址</div>
                <code className="text-sm font-mono text-foreground">https://mock.apihub.com/ecommerce-api</code>
              </div>
            </div>
            <Button variant="outline" size="sm" className="text-xs">
              <Copy className="w-3 h-3 mr-1" /> 复制
            </Button>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Rules list */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Settings2 className="w-4 h-4 text-primary" />
                  Mock 规则列表
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {mockRules.map(rule => (
                    <button
                      key={rule.id}
                      onClick={() => setSelectedRule(rule.id)}
                      className={cn(
                        "w-full text-left px-4 py-3 transition-fast",
                        selectedRule === rule.id ? "bg-primary/5" : "hover:bg-accent/50"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <GripVertical className="w-3 h-3 text-muted-foreground" />
                          <MethodBadge method={rule.method} />
                        </div>
                        <span className="text-xs font-mono text-muted-foreground truncate">{rule.path}</span>
                        <Badge
                          variant={rule.status === 'active' ? 'success' : 'outline'}
                          className="text-2xs ml-auto shrink-0"
                        >
                          {rule.status === 'active' ? '启用' : '停用'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between ml-5">
                        <span className="text-xs font-medium text-foreground">{rule.name}</span>
                        <span className="text-2xs text-muted-foreground">优先级 {rule.priority}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Rule detail */}
          <div className="lg:col-span-3">
            {currentRule ? (
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{currentRule.name}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon-sm" className="text-muted-foreground">
                          {currentRule.status === 'active' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        </Button>
                        <Button variant="ghost" size="icon-sm" className="text-muted-foreground">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">请求方法</label>
                        <div className="flex items-center gap-2">
                          <MethodBadge method={currentRule.method} />
                          <code className="text-xs font-mono text-muted-foreground">{currentRule.path}</code>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">匹配条件</label>
                        <Input defaultValue={currentRule.condition} className="h-8 text-xs font-mono" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">响应状态码</label>
                        <Input defaultValue={String(currentRule.responseCode)} className="h-8 text-xs" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">延迟 (ms)</label>
                        <Input defaultValue={String(currentRule.delay)} className="h-8 text-xs" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">响应体</CardTitle>
                      <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                        <Copy className="w-3 h-3 mr-1" /> 格式化
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      defaultValue={JSON.stringify(JSON.parse(currentRule.responseBody), null, 2)}
                      className="font-mono text-xs min-h-[180px] bg-background"
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">命中统计</span>
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                          <span className="font-semibold text-foreground">{currentRule.hits}</span>
                          <span className="text-muted-foreground">次命中</span>
                        </span>
                        <span className="text-muted-foreground">优先级 {currentRule.priority}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Box className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">选择一个 Mock 规则查看详情</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </ConsoleLayout>
  )
}

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ConsoleLayout } from '@/components/layout/ConsoleLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Globe, Plus, Pencil, Trash2, Eye, EyeOff,
  Copy, Lock, ChevronDown, Check, Settings2
} from 'lucide-react'

const environments = [
  {
    id: 1, name: '开发环境', key: 'dev', baseUrl: 'http://localhost:8080/api',
    active: true,
    vars: [
      { key: 'baseUrl', value: 'http://localhost:8080/api', secret: false },
      { key: 'accessToken', value: 'dev_token_xxx', secret: true },
      { key: 'appId', value: 'app_dev_001', secret: false },
    ]
  },
  {
    id: 2, name: '测试环境', key: 'test', baseUrl: 'https://test-api.apihub.com',
    active: false,
    vars: [
      { key: 'baseUrl', value: 'https://test-api.apihub.com', secret: false },
      { key: 'accessToken', value: 'test_token_xxx', secret: true },
      { key: 'appId', value: 'app_test_001', secret: false },
    ]
  },
  {
    id: 3, name: '生产环境', key: 'prod', baseUrl: 'https://api.apihub.com',
    active: false,
    vars: [
      { key: 'baseUrl', value: 'https://api.apihub.com', secret: false },
      { key: 'accessToken', value: '********', secret: true },
      { key: 'appId', value: 'app_prod_001', secret: false },
      { key: 'secretKey', value: '********', secret: true },
    ]
  },
]

export function EnvironmentPage() {
  const [activeEnv, setActiveEnv] = useState(1)
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})

  const currentEnv = environments.find(e => e.id === activeEnv)!

  return (
    <ConsoleLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">环境管理</h1>
            <p className="text-sm text-muted-foreground mt-1">管理不同环境的变量与密钥配置</p>
          </div>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-1.5" /> 新建环境
          </Button>
        </div>

        {/* Environment tabs */}
        <div className="flex items-center gap-2">
          {environments.map(env => (
            <button
              key={env.id}
              onClick={() => setActiveEnv(env.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-smooth border",
                activeEnv === env.id
                  ? "bg-primary/10 border-primary/20 text-primary"
                  : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              <Globe className="w-3.5 h-3.5" />
              {env.name}
              {env.active && <Badge variant="success" className="text-2xs ml-1">当前</Badge>}
            </button>
          ))}
        </div>

        {/* Environment detail */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Info card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings2 className="w-4 h-4 text-primary" />
                环境信息
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">环境名称</label>
                <Input defaultValue={currentEnv.name} className="h-8 text-xs" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">环境标识</label>
                <Input defaultValue={currentEnv.key} className="h-8 text-xs font-mono" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Base URL</label>
                <Input defaultValue={currentEnv.baseUrl} className="h-8 text-xs font-mono" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 text-xs">
                  <Check className="w-3 h-3 mr-1" /> 设为当前
                </Button>
                <Button variant="outline" size="sm" className="text-xs text-destructive hover:text-destructive">
                  <Trash2 className="w-3 h-3 mr-1" /> 删除
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Variables */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Lock className="w-4 h-4 text-primary" />
                    环境变量
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                    <Plus className="w-3 h-3 mr-1" /> 添加变量
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-surface">
                      <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider">变量名</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider">值</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider w-16">类型</th>
                      <th className="w-20" />
                    </tr>
                  </thead>
                  <tbody>
                    {currentEnv.vars.map(v => (
                      <tr key={v.key} className="border-b border-border last:border-0 hover:bg-accent/30 transition-fast group">
                        <td className="px-4 py-2.5">
                          <span className="font-mono text-foreground">{'{{' + v.key + '}}'}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-muted-foreground">
                              {v.secret && !showSecrets[v.key] ? '••••••••' : v.value}
                            </span>
                            {v.secret && (
                              <button
                                onClick={() => setShowSecrets(prev => ({ ...prev, [v.key]: !prev[v.key] }))}
                                className="text-muted-foreground hover:text-foreground transition-fast"
                              >
                                {showSecrets[v.key] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          {v.secret ? <Badge variant="warning" className="text-2xs">密钥</Badge> : <Badge variant="outline" className="text-2xs">变量</Badge>}
                        </td>
                        <td className="px-2 py-2.5">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-fast">
                            <button className="text-muted-foreground hover:text-foreground"><Copy className="w-3 h-3" /></button>
                            <button className="text-muted-foreground hover:text-foreground"><Pencil className="w-3 h-3" /></button>
                            <button className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ConsoleLayout>
  )
}

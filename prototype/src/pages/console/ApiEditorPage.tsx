import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ConsoleLayout } from '@/components/layout/ConsoleLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Badge, MethodBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Textarea, Select } from '@/components/ui/input'
import {
  Eye, Pencil, Save, Send, Plus, Trash2,
  ChevronDown, ChevronRight, Copy, Code,
  GitBranch, MoreHorizontal, Lock, Unlock,
  FileText, BookOpen, Settings2
} from 'lucide-react'

type ViewMode = 'edit' | 'browse'

const paramRows = [
  { name: 'email', type: 'string', required: true, desc: '用户邮箱地址', example: 'dev@apihub.com' },
  { name: 'password', type: 'string', required: true, desc: '用户密码，最少 8 位', example: '********' },
  { name: 'remember', type: 'boolean', required: false, desc: '是否延长令牌有效期', example: 'true' },
]

const responseFields = [
  { name: 'code', type: 'integer', desc: '业务状态码' },
  { name: 'data.accessToken', type: 'string', desc: '访问令牌' },
  { name: 'data.refreshToken', type: 'string', desc: '刷新令牌' },
  { name: 'data.expiresIn', type: 'integer', desc: '过期时间（秒）' },
  { name: 'data.user', type: 'object', desc: '用户信息对象' },
]

function EditModeToolbar({ onSwitch }: { onSwitch: () => void }) {
  return (
    <div className="sticky top-0 z-10 bg-card/90 glass border-b border-border px-6 py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Badge variant="default" className="text-xs">
          <Pencil className="w-3 h-3 mr-1" /> 编辑模式
        </Badge>
        <div className="h-4 w-px bg-border" />
        <span className="text-xs text-muted-foreground">草稿 · 未发布</span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onSwitch}>
          <Eye className="w-3.5 h-3.5 mr-1.5" /> 预览
        </Button>
        <Button variant="outline" size="sm">
          <GitBranch className="w-3.5 h-3.5 mr-1.5" /> 版本
        </Button>
        <Button size="sm">
          <Save className="w-3.5 h-3.5 mr-1.5" /> 保存
        </Button>
      </div>
    </div>
  )
}

function BrowseModeToolbar({ onSwitch }: { onSwitch: () => void }) {
  return (
    <div className="sticky top-0 z-10 bg-card/90 glass border-b border-border px-6 py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Badge variant="info" className="text-xs">
          <Eye className="w-3 h-3 mr-1" /> 浏览模式
        </Badge>
        <div className="h-4 w-px bg-border" />
        <Badge variant="success" className="text-2xs">v2.3.0</Badge>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onSwitch}>
          <Pencil className="w-3.5 h-3.5 mr-1.5" /> 编辑
        </Button>
        <Button variant="outline" size="sm">
          <Copy className="w-3.5 h-3.5 mr-1.5" /> 分享
        </Button>
        <Button variant="outline" size="sm">
          <Send className="w-3.5 h-3.5 mr-1.5" /> 调试
        </Button>
      </div>
    </div>
  )
}

function EditView() {
  const [activeTab, setActiveTab] = useState<'params' | 'response' | 'settings'>('params')

  return (
    <div className="p-6 space-y-6">
      {/* Basic info - editable */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 items-center">
            <label className="text-xs font-medium text-muted-foreground">方法</label>
            <Select className="w-32 h-8 text-xs">
              <option>POST</option>
              <option>GET</option>
              <option>PUT</option>
              <option>DELETE</option>
              <option>PATCH</option>
            </Select>

            <label className="text-xs font-medium text-muted-foreground">路径</label>
            <Input defaultValue="/auth/login" className="h-8 text-xs font-mono" />

            <label className="text-xs font-medium text-muted-foreground">名称</label>
            <Input defaultValue="用户登录" className="h-8 text-xs" />

            <label className="text-xs font-medium text-muted-foreground">描述</label>
            <Textarea
              defaultValue="通过邮箱和密码登录，返回访问令牌和刷新令牌。令牌有效期 2 小时。"
              className="text-xs min-h-[60px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tab navigation */}
      <div className="flex items-center gap-1 border-b border-border">
        {[
          { id: 'params' as const, label: '请求参数', icon: FileText },
          { id: 'response' as const, label: '响应结构', icon: BookOpen },
          { id: 'settings' as const, label: '高级设置', icon: Settings2 },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-fast -mb-px",
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Params table - editable */}
      {activeTab === 'params' && (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-surface">
                  <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider w-36">参数名</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider w-24">类型</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider w-16">必填</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider">说明</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider w-32">示例</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {paramRows.map(p => (
                  <tr key={p.name} className="border-b border-border last:border-0 hover:bg-accent/30 transition-fast group">
                    <td className="px-4 py-2">
                      <Input defaultValue={p.name} className="h-7 text-xs font-mono border-transparent hover:border-border focus-visible:border-primary/50" />
                    </td>
                    <td className="px-4 py-2">
                      <Select defaultValue={p.type} className="h-7 text-xs border-transparent hover:border-border">
                        <option>string</option>
                        <option>integer</option>
                        <option>boolean</option>
                        <option>object</option>
                        <option>array</option>
                      </Select>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button className="text-muted-foreground hover:text-primary transition-fast">
                        {p.required ? <Lock className="w-3.5 h-3.5 text-primary" /> : <Unlock className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                    <td className="px-4 py-2">
                      <Input defaultValue={p.desc} className="h-7 text-xs border-transparent hover:border-border focus-visible:border-primary/50" />
                    </td>
                    <td className="px-4 py-2">
                      <Input defaultValue={p.example} className="h-7 text-xs font-mono border-transparent hover:border-border focus-visible:border-primary/50" />
                    </td>
                    <td className="px-2 py-2">
                      <button className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-fast">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-3 border-t border-border">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                <Plus className="w-3 h-3 mr-1" /> 添加参数
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'response' && (
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-surface">
              <div className="flex items-center gap-2">
                <Badge variant="success">200</Badge>
                <span className="text-xs text-muted-foreground">成功响应</span>
              </div>
              <Button variant="ghost" size="sm" className="text-xs">
                <Code className="w-3 h-3 mr-1" /> JSON Schema
              </Button>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider">字段路径</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider w-24">类型</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider">说明</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {responseFields.map(f => (
                  <tr key={f.name} className="border-b border-border last:border-0 hover:bg-accent/30 transition-fast group">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1.5">
                        {f.name.includes('.') && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                        <Input defaultValue={f.name} className="h-7 text-xs font-mono border-transparent hover:border-border" />
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <Badge variant="outline">{f.type}</Badge>
                    </td>
                    <td className="px-4 py-2">
                      <Input defaultValue={f.desc} className="h-7 text-xs border-transparent hover:border-border" />
                    </td>
                    <td className="px-2 py-2">
                      <button className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-fast">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {activeTab === 'settings' && (
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">超时时间（ms）</label>
                <Input defaultValue="30000" className="h-8 text-xs" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Content-Type</label>
                <Select className="h-8 text-xs">
                  <option>application/json</option>
                  <option>application/x-www-form-urlencoded</option>
                  <option>multipart/form-data</option>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function BrowseView() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-3">
          <MethodBadge method="POST" />
          <code className="text-sm font-mono text-muted-foreground">/auth/login</code>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">用户登录</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          通过邮箱和密码登录，返回访问令牌和刷新令牌。令牌有效期 2 小时。
        </p>
      </div>

      <section>
        <h2 className="text-base font-semibold text-foreground mb-4">请求参数</h2>
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase">参数</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase">类型</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase">必填</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase">说明</th>
              </tr>
            </thead>
            <tbody>
              {paramRows.map(p => (
                <tr key={p.name} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-foreground">{p.name}</td>
                  <td className="px-4 py-3"><Badge variant="outline">{p.type}</Badge></td>
                  <td className="px-4 py-3">{p.required ? <Badge variant="destructive">必填</Badge> : <span className="text-xs text-muted-foreground">可选</span>}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{p.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground mb-4">响应示例</h2>
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-surface border-b border-border">
            <Badge variant="success">200</Badge>
            <button className="text-muted-foreground hover:text-foreground transition-fast">
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
          <pre className="p-4 text-xs font-mono text-foreground bg-surface/50 leading-relaxed overflow-x-auto">{`{
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
}`}</pre>
        </div>
      </section>
    </div>
  )
}

export function ApiEditorPage() {
  const [mode, setMode] = useState<ViewMode>('edit')

  return (
    <ConsoleLayout>
      {mode === 'edit' ? (
        <>
          <EditModeToolbar onSwitch={() => setMode('browse')} />
          <EditView />
        </>
      ) : (
        <>
          <BrowseModeToolbar onSwitch={() => setMode('edit')} />
          <BrowseView />
        </>
      )}
    </ConsoleLayout>
  )
}

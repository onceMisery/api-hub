import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ConsoleLayout } from '@/components/layout/ConsoleLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge, MethodBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Textarea, Select } from '@/components/ui/input'
import {
  Send, Clock, ChevronDown, Plus, Trash2,
  Copy, Download, RotateCcw, CheckCircle2, XCircle
} from 'lucide-react'

type Tab = 'params' | 'headers' | 'body'
type ResponseTab = 'body' | 'headers' | 'timeline'

const historyItems = [
  { method: 'POST', path: '/auth/login', status: 200, time: '128ms', ts: '14:32:05' },
  { method: 'GET', path: '/products?page=1', status: 200, time: '45ms', ts: '14:28:11' },
  { method: 'POST', path: '/orders/create', status: 400, time: '89ms', ts: '14:25:33' },
  { method: 'GET', path: '/users/me', status: 401, time: '12ms', ts: '14:20:17' },
  { method: 'PUT', path: '/products/42', status: 200, time: '156ms', ts: '14:15:09' },
]

const defaultHeaders = [
  { key: 'Content-Type', value: 'application/json', enabled: true },
  { key: 'Authorization', value: 'Bearer {{accessToken}}', enabled: true },
  { key: 'Accept', value: 'application/json', enabled: true },
]

const sampleResponse = `{
  "code": 200,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJ1c3JfMDFIOFgzWSIsImV4cCI6MTcxMjU5MjAwMH0",
    "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4",
    "expiresIn": 7200,
    "user": {
      "id": "usr_01H8X3Y",
      "email": "dev@apihub.com",
      "name": "开发者",
      "role": "admin"
    }
  }
}`

const responseHeaders = [
  { key: 'Content-Type', value: 'application/json; charset=utf-8' },
  { key: 'X-Request-Id', value: 'req_7f8a9b2c' },
  { key: 'X-Response-Time', value: '128ms' },
  { key: 'Cache-Control', value: 'no-cache' },
]

export function DebugPage() {
  const [method, setMethod] = useState('POST')
  const [reqTab, setReqTab] = useState<Tab>('body')
  const [resTab, setResTab] = useState<ResponseTab>('body')
  const [sent, setSent] = useState(true)

  return (
    <ConsoleLayout>
      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* History sidebar */}
        <div className="w-64 border-r border-border bg-card flex flex-col shrink-0">
          <div className="px-3 py-3 border-b border-border flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">调试历史</span>
            <Button variant="ghost" size="icon-sm" className="text-muted-foreground">
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin py-1">
            {historyItems.map((h, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 mx-1 rounded-lg cursor-pointer transition-fast",
                  i === 0 ? "bg-primary/10" : "hover:bg-accent"
                )}
              >
                <MethodBadge method={h.method} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-mono text-foreground truncate">{h.path}</div>
                  <div className="flex items-center gap-2 text-2xs text-muted-foreground mt-0.5">
                    <span className={h.status < 400 ? 'text-success' : 'text-destructive'}>{h.status}</span>
                    <span>{h.time}</span>
                    <span>{h.ts}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main debug area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* URL bar */}
          <div className="px-4 py-3 border-b border-border bg-card/50 flex items-center gap-3">
            <Select value={method} onChange={e => setMethod(e.target.value)} className="w-28 h-9 text-xs font-bold">
              {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </Select>
            <div className="flex-1 relative">
              <Input
                defaultValue="{{baseUrl}}/auth/login"
                className="h-9 text-xs font-mono pr-20"
                placeholder="输入请求 URL"
              />
              <div className="absolute right-1 top-1/2 -translate-y-1/2">
                <Select className="h-7 text-2xs border-transparent w-24">
                  <option>开发环境</option>
                  <option>测试环境</option>
                  <option>生产环境</option>
                </Select>
              </div>
            </div>
            <Button size="sm" onClick={() => setSent(true)} className="shrink-0">
              <Send className="w-3.5 h-3.5 mr-1.5" /> 发送
            </Button>
          </div>

          {/* Split panels */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Request panel */}
            <div className="flex-1 flex flex-col border-r border-border overflow-hidden">
              <div className="flex items-center gap-1 px-4 py-2 border-b border-border bg-surface/50 shrink-0">
                {[
                  { id: 'params' as Tab, label: 'Query 参数' },
                  { id: 'headers' as Tab, label: 'Headers' },
                  { id: 'body' as Tab, label: 'Body' },
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setReqTab(t.id)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-md transition-fast",
                      reqTab === t.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {reqTab === 'body' && (
                  <div className="h-full">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">请求体 (JSON)</span>
                      <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                        <Copy className="w-3 h-3 mr-1" /> 格式化
                      </Button>
                    </div>
                    <Textarea
                      className="font-mono text-xs min-h-[200px] bg-background"
                      defaultValue={`{
  "email": "dev@apihub.com",
  "password": "mypassword123",
  "remember": true
}`}
                    />
                  </div>
                )}
                {reqTab === 'headers' && (
                  <div className="space-y-2">
                    {defaultHeaders.map((h, i) => (
                      <div key={i} className="flex items-center gap-2 group">
                        <input type="checkbox" defaultChecked={h.enabled} className="accent-primary" />
                        <Input defaultValue={h.key} className="h-7 text-xs font-mono flex-1" placeholder="Key" />
                        <Input defaultValue={h.value} className="h-7 text-xs font-mono flex-1" placeholder="Value" />
                        <button className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-fast">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                      <Plus className="w-3 h-3 mr-1" /> 添加 Header
                    </Button>
                  </div>
                )}
                {reqTab === 'params' && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Input defaultValue="page" className="h-7 text-xs font-mono flex-1" placeholder="Key" />
                      <Input defaultValue="1" className="h-7 text-xs font-mono flex-1" placeholder="Value" />
                      <button className="text-muted-foreground hover:text-destructive transition-fast">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                      <Plus className="w-3 h-3 mr-1" /> 添加参数
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Response panel */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface/50 shrink-0">
                <div className="flex items-center gap-2">
                  {[
                    { id: 'body' as ResponseTab, label: '响应体' },
                    { id: 'headers' as ResponseTab, label: 'Headers' },
                    { id: 'timeline' as ResponseTab, label: '时间线' },
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => setResTab(t.id)}
                      className={cn(
                        "px-3 py-1.5 text-xs font-medium rounded-md transition-fast",
                        resTab === t.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                {sent && (
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1 text-success">
                      <CheckCircle2 className="w-3.5 h-3.5" /> 200 OK
                    </span>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> 128ms
                    </span>
                    <Button variant="ghost" size="icon-sm" className="text-muted-foreground">
                      <Copy className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" className="text-muted-foreground">
                      <Download className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {sent ? (
                  <>
                    {resTab === 'body' && (
                      <pre className="text-xs font-mono text-foreground leading-relaxed whitespace-pre-wrap">{sampleResponse}</pre>
                    )}
                    {resTab === 'headers' && (
                      <div className="space-y-1">
                        {responseHeaders.map(h => (
                          <div key={h.key} className="flex items-baseline gap-3 py-1">
                            <span className="text-xs font-mono font-semibold text-foreground shrink-0">{h.key}:</span>
                            <span className="text-xs font-mono text-muted-foreground break-all">{h.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {resTab === 'timeline' && (
                      <div className="space-y-3">
                        {[
                          { phase: 'DNS 查询', time: '2ms' },
                          { phase: 'TCP 连接', time: '15ms' },
                          { phase: 'TLS 握手', time: '32ms' },
                          { phase: '请求发送', time: '1ms' },
                          { phase: '等待响应', time: '65ms' },
                          { phase: '响应下载', time: '13ms' },
                        ].map(p => (
                          <div key={p.phase} className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground w-20 shrink-0">{p.phase}</span>
                            <div className="flex-1 h-2 rounded-full bg-surface overflow-hidden">
                              <div className="h-full rounded-full gradient-bg" style={{ width: `${parseInt(p.time) / 1.28}%` }} />
                            </div>
                            <span className="text-xs font-mono text-foreground w-12 text-right">{p.time}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                    点击「发送」开始调试
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ConsoleLayout>
  )
}

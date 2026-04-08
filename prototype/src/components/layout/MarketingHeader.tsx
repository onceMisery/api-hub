import { Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Zap } from 'lucide-react'

export function MarketingHeader() {
  const location = useLocation()
  const isHome = location.pathname === '/'

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-smooth ${isHome ? 'glass bg-background/60' : 'bg-background/90 border-b border-border'}`}>
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center transition-spring group-hover:scale-105">
            <Zap className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-foreground">ApiHub</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-fast">
            产品特性
          </Link>
          <Link to="/docs" className="text-sm text-muted-foreground hover:text-foreground transition-fast">
            文档中心
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-fast">
            定价方案
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost" size="sm">登录</Button>
          </Link>
          <Link to="/console">
            <Button size="sm">进入控制台</Button>
          </Link>
        </div>
      </div>
    </header>
  )
}

import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "destructive" | "info" | "outline"
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variantClasses = {
    default: "bg-primary/15 text-primary",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
    destructive: "bg-destructive/15 text-destructive",
    info: "bg-info/15 text-info",
    outline: "border border-border text-muted-foreground",
  }
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  )
}

export function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: "bg-success/15 method-get",
    POST: "bg-warning/15 method-post",
    PUT: "bg-info/15 method-put",
    DELETE: "bg-destructive/15 method-delete",
    PATCH: "bg-success/10 method-patch",
  }
  return (
    <span className={cn(
      "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold font-mono tracking-wider",
      colors[method] || "bg-muted text-muted-foreground"
    )}>
      {method}
    </span>
  )
}

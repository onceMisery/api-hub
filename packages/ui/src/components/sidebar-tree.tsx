export type TreeNode = { id: string; label: string; children?: TreeNode[] };

export function SidebarTree({ nodes }: { nodes: TreeNode[] }) {
  return <pre className="text-xs text-slate-600">{JSON.stringify(nodes, null, 2)}</pre>;
}

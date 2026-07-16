/**
 * 数据库未配置时的统一降级引导组件
 *
 * 当 hasDatabase() 返回 false 时，由以下位置渲染：
 * - proxy.ts Middleware 拦截（API 路由返回 503 JSON）
 * - Dashboard 布局（客户端渲染此组件）
 * - 登录/密码页面（防御性兜底）
 */
import { Database, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface FeatureDisabledViewProps {
  /** 功能名称，如 '仪表盘'、'登录系统' */
  feature?: string;
}

export function FeatureDisabledView({ feature = '此功能' }: FeatureDisabledViewProps) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-zinc-50 dark:bg-zinc-900 p-6">
      <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-zinc-900 p-8 shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-700">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Database size={22} aria-hidden />
          </span>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            数据库未配置
          </h1>
        </div>

        <p className="mb-6 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          {feature}需要数据库支持才能使用。请在环境变量中配置以下任一变量后重启服务：
        </p>

        <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800 p-4 ring-1 ring-zinc-200 dark:ring-zinc-700 mb-6">
          <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
            <li>
              <code className="rounded bg-white dark:bg-zinc-900 px-1.5 py-0.5 font-mono text-xs text-zinc-800 dark:text-zinc-200">
                DATABASE_URL
              </code>
              <span className="ml-2 text-zinc-500">（推荐）</span>
            </li>
            <li>
              <code className="rounded bg-white dark:bg-zinc-900 px-1.5 py-0.5 font-mono text-xs text-zinc-800 dark:text-zinc-200">
                POSTGRES_URL
              </code>
            </li>
            <li>
              <code className="rounded bg-white dark:bg-zinc-900 px-1.5 py-0.5 font-mono text-xs text-zinc-800 dark:text-zinc-200">
                POSTGRES_PRISMA_URL
              </code>
            </li>
          </ul>
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft size={14} />
          返回首页
        </Link>
      </div>
    </div>
  );
}

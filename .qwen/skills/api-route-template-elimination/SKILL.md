---
name: api-route-template-elimination
description: 创建 apiHandler 包装函数消除重复 try/catch/session 模板代码
source: auto-skill
extracted_at: '2026-05-30T03:44:17.496Z'
---

# API 路由重复模板消除

## 问题
Next.js API 路由中大量重复的 try/catch + getSession + logger.error + 500 响应模板，每个 handler 约 7-9 行模板代码。

## 解决方案

### 1. 创建 `lib/api-handler.ts`

```typescript
import { type NextRequest, NextResponse } from 'next/server';
import { createApiLogger } from '@/lib/api-logger';
import { getSession } from '@/lib/auth';

interface ApiHandlerContext { params: Promise<Record<string, string>> }

// 关键：接受同步或异步 handler
type ApiHandler = (
  req: NextRequest,
  context?: ApiHandlerContext,
) => NextResponse | Promise<NextResponse>;

interface ApiHandlerOptions {
  label: string;
  requireAuth?: boolean;
  requireAdmin?: boolean;
}

export function getParam(
  context: ApiHandlerContext | undefined, 
  name: string
): Promise<string> {
  const params = context?.params ?? Promise.resolve({} as Record<string, string>);
  return params.then(p => p[name] ?? '');
}

export function apiHandler(
  method: string,
  options: ApiHandlerOptions,
  handler: ApiHandler,
) {
  const logger = createApiLogger(options.label);
  return async (req: NextRequest, context?: ApiHandlerContext) => {
    try {
      if (options.requireAuth || options.requireAdmin) {
        const session = await getSession();
        if (!session) {
          return NextResponse.json({ error: '未登录' }, { status: 401 });
        }
        if (options.requireAdmin && 
            session.role !== 'admin' && session.role !== 'sudo') {
          return NextResponse.json({ error: '无权限访问' }, { status: 403 });
        }
      }
      return await handler(req, context);
    } catch (error) {
      const msg = `${options.label} 失败`;
      logger.error(method, msg, {
        error: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  };
}

export const ApiErr = {
  unauthorized: (msg = '未登录') => NextResponse.json({ error: msg }, { status: 401 }),
  forbidden: (msg = '无权限访问') => NextResponse.json({ error: msg }, { status: 403 }),
  notFound: (msg = '资源不存在') => NextResponse.json({ error: msg }, { status: 404 }),
  badRequest: (msg = '请求参数错误') => NextResponse.json({ error: msg }, { status: 400 }),
  serverError: (msg = '服务器内部错误') => NextResponse.json({ error: msg }, { status: 500 }),
};
```

### 2. 改造路由文件

**之前：**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createApiLogger } from '@/lib/api-logger';

const logger = createApiLogger('/api/diary');

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });
    // 业务逻辑...
  } catch (error) {
    logger.error('GET', '获取列表失败', { error });
    return NextResponse.json({ error: '获取列表失败' }, { status: 500 });
  }
}
```

**之后：**
```typescript
import { NextResponse } from 'next/server';
import { apiHandler, ApiErr } from '@/lib/api-handler';

export const GET = apiHandler('GET', { label: '获取列表', requireAuth: true }, async (req) => {
  // 纯业务逻辑...（无 try/catch，无 session 检查）
});
```

### 3. 关键注意事项

- `ApiHandler` 类型必须同时接受 `NextResponse | Promise<NextResponse>`，否则同步 handler 会报类型错误
- 内部 handler 中如果需要 session 数据，自行调用 `(await getSession())!`（由 requireAuth 保证非空）
- 删除文件中原有的 `const logger = createApiLogger(...)`（apiHandler 内部已创建）
- 带 `[id]` 参数的路由使用 `getParam(context, 'id')` 获取

### 4. 改造顺序建议
1. 先创建 `lib/api-handler.ts`
2. 按模块分组改造（如 diary→articles→tickets→users）
3. 每组改造后立即 `npx next build` 验证
4. ESLint `require-await` + 类型检查要同时通过

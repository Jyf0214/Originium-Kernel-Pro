/**
 * 自定义页面模板系统
 * 提供 3 种预设模板：空白页面、项目展示、笔记文档
 * 所有模板使用 Tailwind CSS CDN，中文默认文案，响应式设计
 */

/* ------------------------------------------------------------------ */
/*  类型定义                                                           */
/* ------------------------------------------------------------------ */

export type TemplateType = 'blank' | 'project' | 'docs';

export interface TemplateInfo {
  type: TemplateType;
  name: string;
  description: string;
  icon: string; // emoji
}

/* ------------------------------------------------------------------ */
/*  模板元数据列表                                                     */
/* ------------------------------------------------------------------ */

export const templates: TemplateInfo[] = [
  { type: 'blank', name: '空白页面', description: '从零开始，自由创建', icon: '📄' },
  { type: 'project', name: '项目展示', description: '展示项目特性和技术栈', icon: '🚀' },
  { type: 'docs', name: '笔记文档', description: '带目录和搜索的文档页', icon: '📝' },
];

/* ------------------------------------------------------------------ */
/*  公共 HTML 头部（Tailwind CDN + 响应式 meta）                       */
/* ------------------------------------------------------------------ */

function htmlHead(title: string, extraStyles?: string): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    /* 平滑滚动 */
    html { scroll-behavior: smooth; }
    ${extraStyles ?? ''}
  </style>
</head>`;
}

/* ------------------------------------------------------------------ */
/*  工具函数                                                           */
/* ------------------------------------------------------------------ */

/** 简易 HTML 转义，防止标题中的特殊字符破坏页面结构 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ================================================================== */
/*  模板 1：blank（空白页面）                                          */
/* ================================================================== */

function renderBlank({ title }: { title: string }): string {
  return `${htmlHead(title)}
<body class="min-h-screen bg-zinc-50 text-zinc-800 antialiased">
  <div class="flex min-h-screen flex-col items-center justify-center px-6 py-16">
    <h1 class="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
      ${escapeHtml(title)}
    </h1>
    <p class="mt-4 max-w-md text-center text-lg text-zinc-500">
      欢迎使用自定义页面。你可以自由编辑此页面，添加任何内容。
    </p>
  </div>
</body>
</html>`;
}

/* ================================================================== */
/*  模板 2：project（项目展示）                                        */
/* ================================================================== */

function renderProject({ title }: { title: string }): string {
  return `${htmlHead(title, `
    /* 渐变动画 */
    @keyframes gradient-shift {
      0%, 100% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
    }
    .hero-gradient {
      background: linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7, #6366f1);
      background-size: 300% 300%;
      animation: gradient-shift 8s ease infinite;
    }
  `)}
<body class="min-h-screen bg-white text-zinc-800 antialiased">
  <!-- Hero 区域 -->
  <header class="hero-gradient relative overflow-hidden">
    <div class="mx-auto max-w-5xl px-6 py-24 text-center sm:py-32">
      <h1 class="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
        ${escapeHtml(title)}
      </h1>
      <p class="mx-auto mt-6 max-w-2xl text-lg text-white/80 sm:text-xl">
        一个优秀的开源项目，致力于提供最佳开发体验与强大功能支持。
      </p>
      <div class="mt-10 flex flex-wrap items-center justify-center gap-4">
        <a href="#features" class="inline-block rounded-lg bg-white px-6 py-3 text-sm font-semibold text-indigo-600 shadow-lg transition hover:bg-indigo-50">
          了解更多
        </a>
        <a href="#" class="inline-block rounded-lg border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
          查看源码
        </a>
      </div>
    </div>
  </header>

  <!-- 特性卡片区域 -->
  <section id="features" class="mx-auto max-w-5xl px-6 py-20">
    <h2 class="text-center text-3xl font-bold text-zinc-900">核心特性</h2>
    <p class="mx-auto mt-3 max-w-xl text-center text-zinc-500">
      精心设计的功能模块，满足你的各种需求
    </p>
    <div class="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
      <!-- 特性 1 -->
      <div class="rounded-2xl border border-zinc-200 bg-zinc-50 p-8 transition hover:shadow-lg">
        <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-2xl">⚡</div>
        <h3 class="mt-5 text-lg font-semibold text-zinc-900">极速性能</h3>
        <p class="mt-2 text-sm leading-relaxed text-zinc-500">
          基于现代化技术栈构建，冷启动与热更新速度极快，让你专注于创造而非等待。
        </p>
      </div>
      <!-- 特性 2 -->
      <div class="rounded-2xl border border-zinc-200 bg-zinc-50 p-8 transition hover:shadow-lg">
        <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-2xl">🎨</div>
        <h3 class="mt-5 text-lg font-semibold text-zinc-900">优雅设计</h3>
        <p class="mt-2 text-sm leading-relaxed text-zinc-500">
          遵循现代设计规范，内置响应式布局与暗色模式，打造赏心悦目的视觉体验。
        </p>
      </div>
      <!-- 特性 3 -->
      <div class="rounded-2xl border border-zinc-200 bg-zinc-50 p-8 transition hover:shadow-lg">
        <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-2xl">🔒</div>
        <h3 class="mt-5 text-lg font-semibold text-zinc-900">安全可靠</h3>
        <p class="mt-2 text-sm leading-relaxed text-zinc-500">
          严格的安全策略与数据加密机制，保护你的数据免受潜在威胁。
        </p>
      </div>
    </div>
  </section>

  <!-- 截图占位区域 -->
  <section class="bg-zinc-100 py-20">
    <div class="mx-auto max-w-5xl px-6 text-center">
      <h2 class="text-3xl font-bold text-zinc-900">界面预览</h2>
      <p class="mt-3 text-zinc-500">直观感受产品的交互与视觉效果</p>
      <div class="mt-10 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl">
        <div class="flex items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-4 py-3">
          <span class="h-3 w-3 rounded-full bg-red-400"></span>
          <span class="h-3 w-3 rounded-full bg-amber-400"></span>
          <span class="h-3 w-3 rounded-full bg-green-400"></span>
          <span class="ml-4 text-xs text-zinc-400">screenshot-placeholder</span>
        </div>
        <div class="flex h-64 items-center justify-center text-zinc-400 sm:h-80">
          截图占位区域 — 请替换为实际截图
        </div>
      </div>
    </div>
  </section>

  <!-- 技术栈标签区域 -->
  <section class="mx-auto max-w-5xl px-6 py-20">
    <h2 class="text-center text-3xl font-bold text-zinc-900">技术栈</h2>
    <p class="mx-auto mt-3 max-w-xl text-center text-zinc-500">
      采用业界领先的技术方案，确保项目的质量与可维护性
    </p>
    <div class="mt-10 flex flex-wrap items-center justify-center gap-3">
      <span class="rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700">Next.js</span>
      <span class="rounded-full bg-cyan-100 px-4 py-2 text-sm font-medium text-cyan-700">TypeScript</span>
      <span class="rounded-full bg-sky-100 px-4 py-2 text-sm font-medium text-sky-700">Tailwind CSS</span>
      <span class="rounded-full bg-violet-100 px-4 py-2 text-sm font-medium text-violet-700">React</span>
      <span class="rounded-full bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-700">Node.js</span>
      <span class="rounded-full bg-amber-100 px-4 py-2 text-sm font-medium text-amber-700">PostgreSQL</span>
      <span class="rounded-full bg-rose-100 px-4 py-2 text-sm font-medium text-rose-700">Prisma</span>
      <span class="rounded-full bg-teal-100 px-4 py-2 text-sm font-medium text-teal-700">Vercel</span>
    </div>
  </section>

  <!-- 页脚 -->
  <footer class="border-t border-zinc-200 bg-zinc-50 py-10">
    <div class="mx-auto max-w-5xl px-6 text-center text-sm text-zinc-400">
      <p>&copy; ${new Date().getFullYear()} ${escapeHtml(title)}. 保留所有权利。</p>
    </div>
  </footer>
</body>
</html>`;
}

/* ================================================================== */
/*  模板 3：docs（笔记/文档）                                          */
/* ================================================================== */

function renderDocs({ title }: { title: string }): string {
  return `${htmlHead(title, `
    /* 目录侧边栏 */
    .toc-sidebar {
      scrollbar-width: thin;
      scrollbar-color: #d4d4d8 transparent;
    }
    .toc-sidebar::-webkit-scrollbar { width: 4px; }
    .toc-sidebar::-webkit-scrollbar-thumb { background: #d4d4d8; border-radius: 2px; }
    /* 移动端目录遮罩 */
    @media (max-width: 1023px) {
      .toc-overlay { display: none; }
      .toc-overlay.open { display: block; }
      .toc-mobile-panel {
        transform: translateX(-100%);
        transition: transform 0.3s ease;
      }
      .toc-mobile-panel.open { transform: translateX(0); }
    }
  `)}
<body class="min-h-screen bg-white text-zinc-800 antialiased">

  <!-- 顶部导航栏 -->
  <nav class="fixed top-0 z-30 flex h-14 w-full items-center border-b border-zinc-200 bg-white/80 px-4 backdrop-blur-sm sm:px-6">
    <!-- 移动端目录开关按钮 -->
    <button
      id="toc-toggle"
      class="mr-3 flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 lg:hidden"
      aria-label="切换目录"
    >
      <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
    <span class="text-sm font-semibold text-zinc-900">${escapeHtml(title)}</span>

    <!-- 搜索框（纯 UI，无实际功能） -->
    <div class="ml-auto flex items-center">
      <div class="relative">
        <svg class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
        </svg>
        <input
          type="text"
          placeholder="搜索文档…"
          class="h-9 w-48 rounded-lg border border-zinc-200 bg-zinc-50 pl-9 pr-3 text-sm text-zinc-700 placeholder-zinc-400 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 sm:w-64"
        />
        <kbd class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-[10px] text-zinc-400">/</kbd>
      </div>
    </div>
  </nav>

  <!-- 移动端目录遮罩 -->
  <div id="toc-overlay" class="toc-overlay fixed inset-0 z-40 bg-black/40" onclick="closeToc()"></div>

  <!-- 侧边栏目录 -->
  <aside
    id="toc-sidebar"
    class="toc-sidebar toc-mobile-panel fixed left-0 top-14 z-40 h-[calc(100vh-3.5rem)] w-64 overflow-y-auto border-r border-zinc-200 bg-white p-5 lg:translate-x-0"
  >
    <p class="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">目录</p>
    <nav class="space-y-1 text-sm">
      <a href="#section-1" class="block rounded-md px-3 py-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900">项目简介</a>
      <a href="#section-2" class="block rounded-md px-3 py-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900">快速开始</a>
      <a href="#section-3" class="block rounded-md px-3 py-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900">目录结构</a>
      <a href="#section-4" class="block rounded-md px-3 py-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900">配置说明</a>
      <a href="#section-5" class="block rounded-md px-3 py-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900">常见问题</a>
    </nav>
  </aside>

  <!-- 主内容区域 -->
  <main class="ml-0 pt-14 lg:ml-64">
    <article class="mx-auto max-w-3xl px-6 py-10">
      <h1 class="text-3xl font-bold text-zinc-900">${escapeHtml(title)}</h1>
      <p class="mt-2 text-sm text-zinc-400">最后更新于 ${new Date().toLocaleDateString('zh-CN')}</p>

      <hr class="my-8 border-zinc-200" />

      <!-- 内容区块 1 -->
      <section id="section-1" class="mb-12">
        <h2 class="text-xl font-semibold text-zinc-900">项目简介</h2>
        <p class="mt-3 leading-relaxed text-zinc-600">
          这是一段项目简介文本。你可以在这里描述项目的背景、目标和主要功能。
          本文档页面支持左侧目录导航和顶部搜索功能，适合编写结构化的技术文档和学习笔记。
        </p>
      </section>

      <!-- 内容区块 2 -->
      <section id="section-2" class="mb-12">
        <h2 class="text-xl font-semibold text-zinc-900">快速开始</h2>
        <p class="mt-3 leading-relaxed text-zinc-600">
          按照以下步骤快速搭建项目环境：
        </p>
        <ol class="mt-4 list-decimal space-y-2 pl-6 text-zinc-600">
          <li>克隆仓库到本地</li>
          <li>安装项目依赖</li>
          <li>配置环境变量</li>
          <li>启动开发服务器</li>
        </ol>
        <div class="mt-4 overflow-x-auto rounded-lg bg-zinc-900 p-4">
          <pre class="text-sm text-zinc-300"><code>git clone https://github.com/example/project.git
cd project
npm install
npm run dev</code></pre>
        </div>
      </section>

      <!-- 内容区块 3 -->
      <section id="section-3" class="mb-12">
        <h2 class="text-xl font-semibold text-zinc-900">目录结构</h2>
        <div class="mt-4 overflow-x-auto rounded-lg bg-zinc-900 p-4">
          <pre class="text-sm text-zinc-300"><code>project/
├── src/           # 源代码
├── public/        # 静态资源
├── tests/         # 测试文件
├── docs/          # 文档
└── package.json</code></pre>
        </div>
      </section>

      <!-- 内容区块 4 -->
      <section id="section-4" class="mb-12">
        <h2 class="text-xl font-semibold text-zinc-900">配置说明</h2>
        <p class="mt-3 leading-relaxed text-zinc-600">
          项目支持通过配置文件或环境变量进行自定义。详细配置项请参考项目根目录下的配置文件。
        </p>
      </section>

      <!-- 内容区块 5 -->
      <section id="section-5" class="mb-12">
        <h2 class="text-xl font-semibold text-zinc-900">常见问题</h2>
        <details class="mt-4 rounded-lg border border-zinc-200 p-4">
          <summary class="cursor-pointer font-medium text-zinc-700">如何修改端口号？</summary>
          <p class="mt-2 text-sm leading-relaxed text-zinc-500">
            在配置文件中设置 <code class="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-700">port</code> 字段即可。
          </p>
        </details>
        <details class="mt-2 rounded-lg border border-zinc-200 p-4">
          <summary class="cursor-pointer font-medium text-zinc-700">支持哪些浏览器？</summary>
          <p class="mt-2 text-sm leading-relaxed text-zinc-500">
            支持所有现代浏览器，包括 Chrome、Firefox、Safari 和 Edge 的最新两个主要版本。
          </p>
        </details>
      </section>
    </article>
  </main>

  <script>
    // 移动端目录切换逻辑
    var sidebar = document.getElementById('toc-sidebar');
    var overlay = document.getElementById('toc-overlay');
    var toggle = document.getElementById('toc-toggle');

    toggle.addEventListener('click', function () {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('open');
    });

    function closeToc() {
      sidebar.classList.remove('open');
      overlay.classList.remove('open');
    }

    // 点击目录链接后自动关闭移动端侧边栏
    sidebar.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeToc);
    });
  </script>
</body>
</html>`;
}

/* ------------------------------------------------------------------ */
/*  模板映射                                                           */
/* ------------------------------------------------------------------ */

const templateMap: Record<TemplateType, (vars: { title: string }) => string> = {
  blank: renderBlank,
  project: renderProject,
  docs: renderDocs,
};

/* ------------------------------------------------------------------ */
/*  统一渲染入口                                                       */
/* ------------------------------------------------------------------ */

/**
 * 根据模板类型渲染对应的 HTML 页面
 * @param type  模板类型
 * @param vars  模板变量，当前仅支持 title
 * @returns 完整的 HTML5 页面字符串
 */
export function renderTemplate(type: TemplateType, vars: { title: string }): string {
  const renderer = templateMap[type];
  if (!renderer) {
    throw new Error(`未知的模板类型: "${type}"，可选值: ${Object.keys(templateMap).join(', ')}`);
  }
  return renderer(vars);
}

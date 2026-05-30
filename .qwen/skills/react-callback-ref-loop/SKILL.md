---
name: react-callback-ref-loop
description: 使用 propsRef 模式打破 React useCallback 依赖链导致的无限循环/定时器重置
source: auto-skill
extracted_at: '2026-05-30T03:57:08.599Z'
---

# React 依赖链循环修复：propsRef 模式

## 问题场景

React 组件中以下模式会导致循环：

```
setInterval(1s) → re-render → tags.split() 新数组 → 
useCallback 依赖变化 → useEffect 清理+重新设置定时器 → 
定时器被不断重置 → 要么永远不触发，要么意外触发
```

典型场景：自动保存草稿、实时搜索、防抖输入等需要 `useCallback` + `useEffect` + `setTimeout` 组合的功能。

## 根因

- `tags.split(',').map(...)` 每次渲染创建新数组引用
- 新引用 → `useCallback` 依赖数组认为值变化 → 函数重建
- 函数重建 → `useEffect` 清理旧定时器 + 设置新定时器
- `setInterval(1s)` → 持续重渲染 → 持续重建 → 定时器永不触发或意外触发

## 解决方案：propsRef 模式

核心思想：用 `useRef` 存储最新 props，`useCallback` 零依赖，通过 ref 读取最新值。

### 代码模板

```typescript
function useAutoSave({ title, content, tags }: { title: string; content: string; tags: string[] }) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // 1. 用 ref 保存最新 props，避免依赖链
  const propsRef = useRef({ title, content, tags });
  propsRef.current = { title, content, tags }; // 每次渲染更新
  
  // 2. doSave 零依赖，从 ref 读值
  const doSave = useCallback(() => {
    const p = propsRef.current;
    // 空内容守卫
    if (!p.title && !p.content) return;
    
    // 执行保存操作
    saveToServer(p);
  }, []); // 注意：空数组！
  
  // 3. 防抖定时器：只依赖字符串值（稳定引用）
  useEffect(() => {
    if (!title && !content) return; // 空内容不触发
    
    timerRef.current = setTimeout(doSave, 2000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [title, content, doSave]); // 只依赖字符串值 + 稳定函数
  
  // 4. 页面离开时立即保存（可选增强）
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && (title || content)) {
        if (timerRef.current) clearTimeout(timerRef.current);
        doSave();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [title, content, doSave]);
}
```

### 关键点

| 要素 | 说明 |
|------|------|
| `propsRef` | 每次渲染更新，突破 React 闭包陷阱 |
| `doSave()` 零依赖 | `useCallback(fn, [])` 函数永远不变 |
| 守卫条件 | `if (!title && !content) return` 阻止空内容触发 |
| 定时器依赖 | 只依赖 `string` 类型值（稳定引用），不依赖 `array`/`object` |
| `visibilitychange` | 浏览器标签页隐藏时立即执行，避免切走丢数据 |

### 何时使用

- 任何涉及 `useCallback` + useEffect 定时器组合时
- `setInterval` 导致频繁重渲染的场景
- 依赖中有 `array`/`object` 每次渲染新引用的场景
- 自动保存、搜索防抖、轮询等场景

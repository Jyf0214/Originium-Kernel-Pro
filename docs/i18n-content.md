# 多语言文章目录结构

## 目录约定

```
posts/
  zh-CN/
    my-article.md          # 中文版本
  en/
    my-article-en.md       # 英文版本
```

## Frontmatter 字段

每篇文章的 frontmatter 中支持以下多语言字段：

```yaml
---
title: 文章标题
lang: zh-CN                          # 文章语言（默认 'zh-CN'）
translations:                        # 翻译版本映射
  en: /posts/en/my-article-en        # 英文版本路径
  ja: /posts/ja/my-article-ja        # 日文版本路径
---
```

- `lang`：当前文章的语言代码，默认为 `zh-CN`。
- `translations`：键值对映射，键为目标语言代码，值为翻译版本的文章路径（相对于 `/posts`）。

## 兼容性

- 没有 `lang` 字段的文章默认视为中文（`zh-CN`）。
- 没有 `translations` 字段的文章不会显示语言切换按钮。
- 现有的 UI 翻译（`useI18n` hook + `i18n/*.json`）保持不变，与内容翻译独立。

## API

`GET /api/translations?slug=/posts/xxx` 返回指定文章的可用翻译版本。

## 组件

`TranslationSwitcher` 组件集成在文章详情页的标题下方，当文章存在翻译版本时自动显示语言切换按钮。

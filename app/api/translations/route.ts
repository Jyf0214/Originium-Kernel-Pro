import { NextResponse } from 'next/server';
import { getContentFiles, getContentIndexes, filterPublicFiles } from '@/lib/content';
import { apiHandler } from '@/lib/api-handler';

/**
 * 翻译查询 API
 *
 * GET /api/translations?slug=/posts/xxx
 *
 * 根据文章 frontmatter 中的 lang 和 translations 字段，
 * 返回当前文章的所有可用翻译版本。
 *
 * 响应格式：
 * {
 *   original: { lang: 'zh-CN', slug: '/posts/zh-CN/article' },
 *   translations: [{ lang: 'en', slug: '/posts/en/article-en', title: '...' }]
 * }
 */
export const GET = apiHandler('GET', { label: '翻译查询' }, (request) => {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug) {
    return NextResponse.json(
      { error: '缺少必需参数 slug', original: null, translations: [] },
      { status: 400 },
    );
  }

  const allFiles = filterPublicFiles(getContentFiles('posts'), getContentIndexes('posts'));

  // 找到原始文章
  const originalFile = allFiles.find((f) => f.slug === slug);
  if (!originalFile) {
    return NextResponse.json(
      { error: '未找到指定文章', original: null, translations: [] },
      { status: 404 },
    );
  }

  const originalLang = (originalFile.meta.lang as string) ?? 'zh-CN';
  const translationsMap = originalFile.meta.translations;

  // 如果 frontmatter 中定义了 translations 字段，直接使用
  if (translationsMap && Object.keys(translationsMap).length > 0) {
    const translations = Object.entries(translationsMap)
      .map(([lang, translationSlug]) => {
        const targetFile = allFiles.find((f) => f.slug === translationSlug);
        return {
          lang,
          slug: translationSlug,
          title: targetFile?.meta.title ?? translationSlug,
        };
      })
      .filter((t) => t.lang !== originalLang);

    return NextResponse.json(
      {
        original: { lang: originalLang, slug },
        translations,
      },
      {
        headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
      },
    );
  }

  // 没有 frontmatter 映射时，扫描同目录下不同语言前缀的文件
  const slugParts = slug.split('/').filter(Boolean);
  // slug 格式：/posts/[lang-prefix?]/article-name
  // 尝试从路径结构中识别语言前缀
  const translations: { lang: string; slug: string; title: string }[] = [];

  for (const file of allFiles) {
    if (file.slug === slug) continue;

    const fileLang = (file.meta.lang as string) ?? 'zh-CN';
    // 同一目录下不同语言的文件视为翻译版本
    const fileParts = file.slug.split('/').filter(Boolean);
    const fileDir = fileParts.slice(0, -1).join('/');
    const originalDir = slugParts.slice(0, -1).join('/');

    // 如果目录相同（同语言）但文件不同，跳过
    // 如果目录不同（不同语言前缀）且文件名相似，或 frontmatter lang 不同
    if (fileDir !== originalDir && fileLang !== originalLang) {
      // 检查文件名是否相似（去掉语言前缀后匹配）
      const fileName = fileParts[fileParts.length - 1];
      const originalName = slugParts[slugParts.length - 1];
      if (fileName === originalName || file.meta.title === originalFile.meta.title) {
        translations.push({
          lang: fileLang,
          slug: file.slug,
          title: file.meta.title,
        });
      }
    }
  }

  return NextResponse.json(
    {
      original: { lang: originalLang, slug },
      translations,
    },
    {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    },
  );
});

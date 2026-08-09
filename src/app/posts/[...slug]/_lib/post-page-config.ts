import type { FrontendConfig } from '@/hooks/use-config';

export function buildTocConfig(appConfig: FrontendConfig) {
  return {
    enabled: appConfig.toc?.post ?? false,
    number: appConfig.toc?.number ?? true,
    expand: appConfig.toc?.expand ?? false,
    styleSimple: appConfig.toc?.styleSimple ?? false,
  };
}

export function computeWordStats(content: string) {
  const wordCount = content.length;
  const readingTime = Math.ceil(wordCount / 500);
  const headingCount = (content.match(/^#{2,4}\s+.+$/gm) ?? []).length;
  return { wordCount, readingTime, headingCount };
}

export function buildCopyrightConfig(appConfig: FrontendConfig) {
  return {
    enable: appConfig.copyright?.enable ?? true,
    license: appConfig.copyright?.license ?? 'CC BY-NC-SA 4.0',
    licenseUrl: appConfig.copyright?.licenseUrl ?? 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
    authorLink: appConfig.copyright?.authorLink ?? '/',
    authorHref: appConfig.copyright?.authorHref ?? '',
    authorImgFront: appConfig.avatar?.url,
    decode: appConfig.copyright?.decode,
    labels: appConfig.copyright?.labels,
  };
}


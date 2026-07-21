/**
 * Lighthouse CI 配置文件
 *
 * 用于自动化性能、无障碍、SEO 评分。
 * 运行方式：npx lhci autorun（需要安装 @lhci/cli）
 *
 * 注意：此配置为预备配置，需要安装 @lhci/cli 后才能运行。
 * 安装命令：npm install -D @lhci/cli
 */
module.exports = {
  ci: {
    collect: {
      // 静态导出模式下使用本地文件服务器
      staticDistDir: './out',
      numberOfRuns: 3,
      url: [
        'http://localhost:8080/',
        'http://localhost:8080/posts',
        'http://localhost:8080/tags',
      ],
    },
    assert: {
      assertions: {
        // 性能评分 >= 90
        'categories:performance': ['error', { minScore: 0.9 }],
        // 无障碍评分 >= 90
        'categories:accessibility': ['warn', { minScore: 0.9 }],
        // SEO 评分 >= 90
        'categories:seo': ['warn', { minScore: 0.9 }],
        // 最大内容绘制 <= 2.5s
        'first-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        // 最大内容绘制 <= 2.5s
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        // 累积布局偏移 <= 0.1
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
        // 总阻塞时间 <= 200ms
        'total-blocking-time': ['warn', { maxNumericValue: 200 }],
      },
    },
    upload: {
      // 可选：上传到 Lighthouse CI Dashboard
      // target: 'lhci',
      // serverBaseUrl: 'https://your-lhci-server.com',
    },
  },
};

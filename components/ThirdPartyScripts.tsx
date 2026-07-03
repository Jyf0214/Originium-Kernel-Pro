// ThirdPartyScripts - 第三方脚本 Partytown 加载器
// 将 Analytics 等第三方脚本卸载到 Web Worker 执行，避免阻塞主线程。
// 使用 next/script strategy="worker" 自动集成 Partytown。

'use client';

import Script from 'next/script';

/**
 * 第三方脚本加载器
 *
 * 通过 Partytown Web Worker 执行第三方脚本：
 * - Vercel Analytics：页面访问追踪
 * - Vercel SpeedInsights：Core Web Vitals 收集
 *
 * 效果：第三方 JS 不再占用主线程时间，首屏 FCP/TBT 显著改善。
 */
export function ThirdPartyScripts() {
  return (
    <>
      {/* Vercel Analytics - 通过 Partytown Worker 执行 */}
      <Script
        src="https://va.vercel-scripts.com/v1/script.debug.js"
        strategy="worker"
        data-auto-recording="false"
      />

      {/* Vercel SpeedInsights - 通过 Partytown Worker 执行 */}
      <Script
        strategy="worker"
        dangerouslySetInnerHTML={{
          __html: `
            (function(){
              try{
                var script=document.createElement('script');
                script.src='https://va.vercel-scripts.com/v1/speed-insights/script.debug.js';
                script.defer=true;
                document.head.appendChild(script);
              }catch(e){}
            })()
          `,
        }}
      />
    </>
  );
}

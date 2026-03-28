import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getFileFromGithub, syncConfigToGithub } from '@/lib/github';
import yaml from 'js-yaml';

/**
 * System Configuration API
 * 
 * 配置优先级：
 * 1. 环境变量（GitHub 配置）
 * 2. 数据库缓存（站点配置）
 * 3. GitHub config.yaml（站点配置）
 * 4. 默认值
 */

// 默认配置
const defaultConfig = {
  siteTitle: 'Originium Kernel',
  siteDescription: '现代内容发布平台',
  // 背景配置
  background: {
    url: '',
    opacity: 0.8,
  },
  // GitHub 配置只从环境变量读取
  githubRepo: process.env.GITHUB_REPO || '',
  githubToken: process.env.GITHUB_TOKEN || '',
};

export async function GET() {
  const db = getDb();
  
  // 1. 从数据库读取缓存的站点配置
  let cached = await db.get('config:main');
  let config: any = cached ? JSON.parse(cached) : { ...defaultConfig };
  
  // 2. 始终使用环境变量的 GitHub 配置
  config.githubRepo = process.env.GITHUB_REPO || config.githubRepo || '';
  config.githubToken = process.env.GITHUB_TOKEN ? '********' : '';
  
  // 3. 如果没有缓存且有 GitHub 凭据，尝试从 GitHub 同步
  if (!cached) {
    const repo = process.env.GITHUB_REPO;
    const token = process.env.GITHUB_TOKEN;
    if (repo && token) {
      try {
        const remote = await getFileFromGithub(repo, token, 'config.yaml');
        if (remote) {
          const parsed = yaml.load(remote.content) as any;
          // 合并配置，但不覆盖环境变量的 GitHub 配置
          config = {
            ...config,
            siteTitle: parsed.siteTitle || config.siteTitle,
            siteDescription: parsed.siteDescription || config.siteDescription,
            background: parsed.background || config.background,
          };
          await db.set('config:main', JSON.stringify(config));
        }
      } catch (err) {
        console.error('Failed to sync config from GitHub:', err);
      }
    }
  }

  return NextResponse.json(config);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'sudo')) {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }

  try {
    const newConfig = await req.json();
    const db = getDb();

    // 1. 读取现有配置
    const existingStr = await db.get('config:main');
    const existing = existingStr ? JSON.parse(existingStr) : {};
    
    // 2. 合并配置（只更新站点配置，不更新 GitHub 配置）
    const mergedConfig = {
      ...existing,
      siteTitle: newConfig.siteTitle || existing.siteTitle || defaultConfig.siteTitle,
      siteDescription: newConfig.siteDescription || existing.siteDescription || defaultConfig.siteDescription,
      background: newConfig.background !== undefined ? newConfig.background : (existing.background || defaultConfig.background),
      // GitHub 配置始终从环境变量读取
      githubRepo: process.env.GITHUB_REPO || '',
      githubToken: process.env.GITHUB_TOKEN ? '********' : '',
    };

    // 3. 保存到数据库
    await db.set('config:main', JSON.stringify(mergedConfig));

    // 4. 如果有 GitHub 配置，同步站点配置到 GitHub
    const githubRepo = process.env.GITHUB_REPO;
    const githubToken = process.env.GITHUB_TOKEN;
    if (githubRepo && githubToken) {
      const yamlConfig = {
        siteTitle: mergedConfig.siteTitle,
        siteDescription: mergedConfig.siteDescription,
      };
      await syncConfigToGithub(githubRepo, githubToken, yamlConfig);
    }

    return NextResponse.json({ success: true, config: mergedConfig });
  } catch (error: any) {
    console.error('Update config error:', error);
    return NextResponse.json({ error: error.message || '保存失败' }, { status: 500 });
  }
}

/**
 * 强制从 GitHub 同步配置
 */
export async function PUT() {
  const db = getDb();
  
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;

  if (!repo || !token) {
    return NextResponse.json({ error: 'GitHub 未配置' }, { status: 400 });
  }

  try {
    const remote = await getFileFromGithub(repo, token, 'config.yaml');
    if (remote) {
      const parsed = yaml.load(remote.content) as any;
      
      // 读取现有配置
      const existingStr = await db.get('config:main');
      const existing = existingStr ? JSON.parse(existingStr) : {};
      
      // 合并配置
      const mergedConfig = {
        ...existing,
        siteTitle: parsed.siteTitle || existing.siteTitle || defaultConfig.siteTitle,
        siteDescription: parsed.siteDescription || existing.siteDescription || defaultConfig.siteDescription,
        background: parsed.background || existing.background || defaultConfig.background,
        githubRepo: repo,
        githubToken: '********',
      };
      
      await db.set('config:main', JSON.stringify(mergedConfig));
      return NextResponse.json({ success: true, config: mergedConfig });
    }
    return NextResponse.json({ error: 'config.yaml 不存在' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: '同步失败' }, { status: 500 });
  }
}

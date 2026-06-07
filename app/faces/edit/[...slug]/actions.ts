'use server';

import { updateFileInGithub, deleteFileFromGithub } from '@/lib/github';
import { generateMarkdown, type FrontMatter } from '@/lib/markdown';
import { getSession } from '@/lib/auth';
import { getEnvConfig } from '@/lib/env';
import { createApiLogger } from '@/lib/api-logger';

const logger = createApiLogger('/faces/edit/[...slug]');

/**
 * 编辑联系人参数
 */
export interface EditFaceParams {
  oldPath: string;
  name: string;
  email: string;
  phone: string;
  group: string;
  content: string;
}

/**
 * 编辑联系人结果
 */
export interface EditFaceResult {
  success: boolean;
  newSlug: string;
  messageKey: 'faces.editSuccessMoved' | 'faces.editSuccess';
}

/**
 * 生成文件 slug（从姓名生成）
 */
function generateSlug(name: string): string {
  return name
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || name;
}

/**
 * 检查用户是否有管理联系人的权限
 */
async function checkPermission(): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;
  return session.role === 'admin' || session.role === 'sudo';
}

/**
 * 编辑联系人（通过 GitHub API）
 *
 * 如果姓名或分组改变，会删除旧文件并创建新文件
 */
export async function editFace(params: EditFaceParams): Promise<EditFaceResult> {
  const hasPermission = await checkPermission();
  if (!hasPermission) {
    throw new Error('无权限修改联系人');
  }

  const env = getEnvConfig();
  if (!env.githubRepo || !env.githubToken) {
    throw new Error('GitHub 配置缺失');
  }

  const { oldPath, name, email, phone, group, content } = params;

  if (!name || !group) {
    throw new Error('姓名和分组为必填项');
  }

  const newSlug = generateSlug(name);
  const newPath = `faces/${group}/${newSlug}.md`;
  const isPathChanged = newPath !== oldPath;

  // 构建 Front Matter
  const frontMatter: FrontMatter = {
    title: name,
    name,
    email: email || '',
    phone: phone || '',
    group,
    date: new Date().toISOString(),
  };

  // 生成完整的 Markdown 内容
  const markdownContent = generateMarkdown(frontMatter, content || '');

  try {
    if (isPathChanged) {
      // 路径改变：先创建新文件，再删除旧文件
      await updateFileInGithub({
        repo: env.githubRepo,
        token: env.githubToken,
        path: newPath,
        content: markdownContent,
        message: `update: move contact "${name}" to ${newPath}`,
      });

      await deleteFileFromGithub(env.githubRepo, env.githubToken, oldPath);

      return {
        success: true,
        newSlug: `/${group}/${newSlug}`,
        messageKey: 'faces.editSuccessMoved',
      };
    }

    // 路径未改变：直接更新文件
    await updateFileInGithub({
      repo: env.githubRepo,
      token: env.githubToken,
      path: oldPath,
      content: markdownContent,
      message: `update: update contact "${name}"`,
    });

    return {
      success: true,
      newSlug: `/${group}/${newSlug}`,
      messageKey: 'faces.editSuccess',
    };
  } catch (error) {
    logger.error('editFace', '编辑联系人失败', { error: error instanceof Error ? error.message : String(error) });
    throw new Error(error instanceof Error ? error.message : '编辑联系人失败');
  }
}

/**
 * 删除联系人（通过 GitHub API）
 */
export async function deleteFace(path: string): Promise<{ success: boolean; messageKey: 'faces.deleteSuccess' }> {
  const hasPermission = await checkPermission();
  if (!hasPermission) {
    throw new Error('无权限删除联系人');
  }

  const env = getEnvConfig();
  if (!env.githubRepo || !env.githubToken) {
    throw new Error('GitHub 配置缺失');
  }

  try {
    await deleteFileFromGithub(env.githubRepo, env.githubToken, path);

    return {
      success: true,
      messageKey: 'faces.deleteSuccess',
    };
  } catch (error) {
    logger.error('deleteFace', '删除联系人失败', { error: error instanceof Error ? error.message : String(error) });
    throw new Error(error instanceof Error ? error.message : '删除联系人失败');
  }
}

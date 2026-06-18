/**
 * 草稿文件系统存储模块
 * 草稿正文存储在项目本地文件系统，不存入数据库
 */
import * as fs from 'fs';
import * as path from 'path';

const DRAFTS_DIR = path.join(process.cwd(), 'data', 'drafts');

function ensureDraftsDir() {
  if (!fs.existsSync(DRAFTS_DIR)) {
    fs.mkdirSync(DRAFTS_DIR, { recursive: true });
  }
}

export async function saveDraft(id: string, content: string): Promise<void> {
  // 防止路径穿越攻击
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new Error('Invalid draft ID');
  }
  ensureDraftsDir();
  const filePath = path.join(DRAFTS_DIR, `${id}.md`);
  await fs.promises.writeFile(filePath, content, 'utf-8');
}

export async function getDraft(id: string): Promise<string | null> {
  // 防止路径穿越攻击
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new Error('Invalid draft ID');
  }
  const filePath = path.join(DRAFTS_DIR, `${id}.md`);
  try {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    return content;
  } catch {
    return null;
  }
}

export async function deleteDraft(id: string): Promise<void> {
  // 防止路径穿越攻击
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new Error('Invalid draft ID');
  }
  const filePath = path.join(DRAFTS_DIR, `${id}.md`);
  try {
    await fs.promises.unlink(filePath);
  } catch {
    // 文件不存在时忽略错误
  }
}
import { Octokit } from 'octokit';
import yaml from 'js-yaml';

/**
 * GitHub 集成 — 文件推送/读取/删除
 */

interface GithubSyncParams {
  repo: string;
  token: string;
  path: string;
  content: string;
  message: string;
}

/** 从 GitHub 获取文件内容 */
export async function getFileFromGithub(repo: string, token: string, path: string) {
  const [owner, repoName] = repo.split('/');
  const octokit = new Octokit({ auth: token });

  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo: repoName,
      path,
    });

    if ('content' in data) {
      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      return { content, sha: data.sha };
    }
    return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    if (error.status === 404) return null;
    throw error;
  }
}

/** 创建或更新 GitHub 上的文件 */
export async function updateFileInGithub({ repo, token, path, content, message }: GithubSyncParams) {
  const [owner, repoName] = repo.split('/');
  const octokit = new Octokit({ auth: token });
  const existingFile = await getFileFromGithub(repo, token, path);

  return await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo: repoName,
    path,
    message,
    content: Buffer.from(content).toString('base64'),
    sha: existingFile?.sha,
  });
}

/** 删除 GitHub 上的文件 */
export async function deleteFileFromGithub(repo: string, token: string, path: string) {
  const [owner, repoName] = repo.split('/');
  const octokit = new Octokit({ auth: token });
  const existingFile = await getFileFromGithub(repo, token, path);
  if (!existingFile) return null;

  return await octokit.rest.repos.deleteFile({
    owner,
    repo: repoName,
    path,
    message: `delete: remove ${path}`,
    sha: existingFile.sha,
  });
}

/**
 * 将帖子以 Markdown 格式推送到 GitHub posts/ 目录
 * 文件路径格式：posts/{category}/{slug}.md
 */
export async function syncPostToGithub(
  repo: string,
  token: string,
  post: {
    slug: string;
    title: string;
    content: string;
    author?: string;
    tags?: string[];
    cover?: string;
    date?: string;
    description?: string;
  },
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const frontMatter: Record<string, any> = {
    title: post.title,
    author: post.author || 'Anonymous',
    date: post.date || new Date().toISOString(),
    tags: post.tags || [],
  };
  if (post.cover) frontMatter.cover = post.cover;
  if (post.description) frontMatter.description = post.description;

  const fileContent = `---\n${yaml.dump(frontMatter)}---\n\n${post.content}`;
  const filePath = `posts${post.slug}.md`;

  return await updateFileInGithub({
    repo,
    token,
    path: filePath,
    content: fileContent,
    message: `feat: publish post "${post.title}"`,
  });
}

/**
 * 从 GitHub posts/ 目录删除帖子
 */
export async function deletePostFromGithub(repo: string, token: string, slug: string) {
  const filePath = `posts${slug}.md`;
  return await deleteFileFromGithub(repo, token, filePath);
}

/**
 * 同步配置到 GitHub（YAML + JSON 双格式）
 */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function syncConfigToGithub(repo: string, token: string, config: any) {
  const yamlContent = yaml.dump(config);
  const jsonContent = JSON.stringify(config, null, 2);

  await updateFileInGithub({
    repo,
    token,
    path: 'config.yaml',
    content: yamlContent,
    message: 'chore: update config.yaml',
  });
  await updateFileInGithub({
    repo,
    token,
    path: 'config.json',
    content: jsonContent,
    message: 'chore: update config.json',
  });
}

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

/** 动态导入 Octokit 模块并缓存，避免每次调用都重新解析 import */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _octokitMod: { Octokit: any } | null = null

/** 模块级 Octokit 实例缓存，key 为 token，避免每次请求都新建实例 */
const octokitCache = new Map<string, unknown>()

async function getOctokit(token: string) {
  if (octokitCache.has(token)) {
    return octokitCache.get(token)
  }
  _octokitMod ??= await import('octokit')
  const { Octokit } = _octokitMod
  const instance = new Octokit({ auth: token })
  octokitCache.set(token, instance)
  return instance
}

/** 从 GitHub 获取文件内容 */
export async function getFileFromGithub(repo: string, token: string, path: string) {
  const [owner = '', repoName = ''] = repo.split('/');
  const octokit = await getOctokit(token);

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
   
  } catch (error: unknown) {
    if (error instanceof Error && 'status' in error && error.status === 404) return null;
    throw error;
  }
}

/** 创建或更新 GitHub 上的文件 */
export async function updateFileInGithub({ repo, token, path, content, message }: GithubSyncParams) {
  const [owner = '', repoName = ''] = repo.split('/');
  const octokit = await getOctokit(token);
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
  const [owner = '', repoName = ''] = repo.split('/');
  const octokit = await getOctokit(token);
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
  const frontMatter: Record<string, string | string[] | undefined> = {
    title: post.title,
    author: post.author ?? 'Anonymous',
    date: post.date ?? new Date().toISOString(),
    tags: post.tags ?? [],
  };
  if (post.cover) frontMatter.cover = post.cover;
  if (post.description) frontMatter.description = post.description;

  const fileContent = `---\n${JSON.stringify(frontMatter, null, 2).replace(/\n/g, '\n')}---\n\n${post.content}`;
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

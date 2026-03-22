import { Octokit } from 'octokit';
import yaml from 'js-yaml';

/**
 * GitHub Integration for Originium Kernel
 */

interface GithubSyncParams {
  repo: string;
  token: string;
  path: string;
  content: string;
  message: string;
}

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
  } catch (error: any) {
    if (error.status === 404) return null;
    throw error;
  }
}

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

/**
 * Sync config to GitHub (支持 YAML 和 JSON 格式)
 */
export async function syncConfigToGithub(repo: string, token: string, config: any) {
  // 优先使用 YAML 格式（可读性高）
  const yamlContent = yaml.dump(config);
  
  // 同时保存 YAML 和 JSON 格式
  const jsonContent = JSON.stringify(config, null, 2);
  
  // 保存 config.yaml
  await updateFileInGithub({
    repo,
    token,
    path: 'config.yaml',
    content: yamlContent,
    message: 'chore: update config.yaml',
  });
  
  // 保存 config.json（方便程序读取）
  await updateFileInGithub({
    repo,
    token,
    path: 'config.json',
    content: jsonContent,
    message: 'chore: update config.json',
  });
}

/**
 * Sync article to GitHub
 */
export async function syncArticleToGithub(repo: string, token: string, article: any) {
  const { id, title, content, authorName, tags, coverImage, createdAt } = article;
  
  const frontMatter = {
    title,
    author: authorName,
    tags: tags || [],
    cover: coverImage || '',
    date: createdAt,
  };

  const fileContent = `---\n${yaml.dump(frontMatter)}---\n\n${content}`;
  const fileName = `articles/${id}.md`;

  return await updateFileInGithub({
    repo,
    token,
    path: fileName,
    content: fileContent,
    message: `feat: publish article "${title}"`,
  });
}

/**
 * Delete file from GitHub
 */
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

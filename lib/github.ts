import { Octokit } from 'octokit';
import matter from 'gray-matter';

interface SyncOptions {
  repo: string;
  token: string;
  article: {
    id: string;
    title: string;
    content: string;
    authorName: string;
    tags?: string[];
    createdAt: string;
    updatedAt: string;
  };
}

export async function syncToGithub({ repo, token, article }: SyncOptions) {
  try {
    const octokit = new Octokit({ auth: token });
    const [owner, repoName] = repo.split('/');
    
    if (!owner || !repoName) {
      throw new Error('Invalid repository format. Use owner/repo');
    }

    const path = `source/_posts/${article.id}.md`;
    
    // Create frontmatter
    const fileContent = matter.stringify(article.content, {
      title: article.title,
      date: article.createdAt,
      updated: article.updatedAt,
      tags: article.tags || [],
      author: article.authorName,
    });

    // Check if file exists to get SHA for update
    let sha: string | undefined;
    try {
      const { data } = await octokit.rest.repos.getContent({
        owner,
        repo: repoName,
        path,
      });
      if (!Array.isArray(data) && data.type === 'file') {
        sha = data.sha;
      }
    } catch (error: any) {
      if (error.status !== 404) throw error;
    }

    // Create or update file
    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo: repoName,
      path,
      message: `Sync article: ${article.title}`,
      content: Buffer.from(fileContent).toString('base64'),
      sha,
    });

    return { success: true };
  } catch (error) {
    console.error('GitHub Sync Error:', error);
    throw error;
  }
}

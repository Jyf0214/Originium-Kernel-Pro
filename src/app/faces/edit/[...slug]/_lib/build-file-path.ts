/** 从 useParams 拿到的 slug 数组构造完整路径与文件路径 */
export function buildFacePaths(slug: unknown): { fullPath: string; filePath: string } {
  const slugArray = (Array.isArray(slug) ? slug : []) as string[];
  const fullPath = '/' + slugArray.join('/');
  const filePath = `faces${fullPath}.md`;
  return { fullPath, filePath };
}

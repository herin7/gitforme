import fetch from 'node-fetch';

// Helper to extract owner/repo from GitHub URL
function parseRepoUrl(repoUrl: string): { owner: string; repo: string } | null {
  const match = repoUrl.match(/github.com\/(.+?)\/(.+?)(?:$|\/|\?)/);
  if (match) {
    return { owner: match[1], repo: match[2] };
  }
  return null;
}

export async function fetchRepoInsights(repoUrl: string): Promise<string> {
  const repoInfo = parseRepoUrl(repoUrl);
  if (!repoInfo) {
    return 'Error: Invalid GitHub repository URL.';
  }
  const { owner, repo } = repoInfo;
  try {
    // Fetch branches
    const branchesRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches`);
    if (!branchesRes.ok) {
      throw new Error(`Failed to fetch branches: ${branchesRes.status} ${branchesRes.statusText}`);
    }
  const branches = await branchesRes.json() as Array<{ name: string }>;
    let result = `Branches found: ${branches.map((b) => b.name).join(', ')}\n`;
    // For each branch, fetch tree
    for (const branch of branches) {
      const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch.name}?recursive=1`);
      if (!treeRes.ok) {
        result += `Branch ${branch.name}: Failed to fetch tree.\n`;
        continue;
      }
  const treeData = await treeRes.json() as { tree: Array<{ path: string; type: string }> };
      // List folders
      const folders = Array.from(new Set(treeData.tree.filter((item) => item.type === 'tree').map((item) => item.path.split('/')[0])));
      result += `Branch ${branch.name}: Folders: ${folders.join(', ')}\n`;
    }
    return result;
  } catch (err: unknown) {
    if (err instanceof Error) {
      return `Error: ${err.message}`;
    }
    return 'An unknown error occurred';
  }
}

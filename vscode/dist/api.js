"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchRepoInsights = fetchRepoInsights;
const node_fetch_1 = __importDefault(require("node-fetch"));
// Helper to extract owner/repo from GitHub URL
function parseRepoUrl(repoUrl) {
    const match = repoUrl.match(/github.com\/(.+?)\/(.+?)(?:$|\/|\?)/);
    if (match) {
        return { owner: match[1], repo: match[2] };
    }
    return null;
}
async function fetchRepoInsights(repoUrl) {
    const repoInfo = parseRepoUrl(repoUrl);
    if (!repoInfo) {
        return 'Error: Invalid GitHub repository URL.';
    }
    const { owner, repo } = repoInfo;
    try {
        // Fetch branches
        const branchesRes = await (0, node_fetch_1.default)(`https://api.github.com/repos/${owner}/${repo}/branches`);
        if (!branchesRes.ok) {
            throw new Error(`Failed to fetch branches: ${branchesRes.status} ${branchesRes.statusText}`);
        }
        const branches = await branchesRes.json();
        let result = `Branches found: ${branches.map((b) => b.name).join(', ')}\n`;
        // For each branch, fetch tree
        for (const branch of branches) {
            const treeRes = await (0, node_fetch_1.default)(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch.name}?recursive=1`);
            if (!treeRes.ok) {
                result += `Branch ${branch.name}: Failed to fetch tree.\n`;
                continue;
            }
            const treeData = await treeRes.json();
            // List folders
            const folders = Array.from(new Set(treeData.tree.filter((item) => item.type === 'tree').map((item) => item.path.split('/')[0])));
            result += `Branch ${branch.name}: Folders: ${folders.join(', ')}\n`;
        }
        return result;
    }
    catch (err) {
        if (err instanceof Error) {
            return `Error: ${err.message}`;
        }
        return 'An unknown error occurred';
    }
}

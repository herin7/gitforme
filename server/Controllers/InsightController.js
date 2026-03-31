const axios = require('axios');
const User = require('../models/UserModel');
const redisClient = require('../util/RediaClient');
const { checkOSVVulnerabilities } = require('../api/osvApi');
const { createGithubApi } = require('../util/githubApi');
const fetchAndMergeDependencies = async (githubApi, owner, repo, packageNodes) => {
    let allDependencies = {};

    // Fetch all package.json contents concurrently
    const fetchPromises = packageNodes.map(async (node) => {
        try {
            const fileResponse = await githubApi.get(`/repos/${owner}/${repo}/contents/${node.path}`);
            const content = JSON.parse(Buffer.from(fileResponse.data.content, 'base64').toString());
            return { ...content.dependencies, ...content.devDependencies };
        } catch (e) {
            console.warn(`Could not read ${node.path} in ${owner}/${repo}:`, e.message);
            return {};
        }
    });

    const dependenciesArray = await Promise.all(fetchPromises);

    // Merge them all into a single object
    dependenciesArray.forEach(deps => {
        allDependencies = { ...allDependencies, ...deps };
    });

    return allDependencies;
};


exports.scanSingleRepoVulnerabilities = async (req, res) => {
    const { username, reponame } = req.params;

    try {
        const githubApi = await createGithubApi(req.session);

        const repoDetails = await githubApi.get(`/repos/${username}/${reponame}`);
        const defaultBranch = repoDetails.data.default_branch;

        const treeResponse = await githubApi.get(`/repos/${username}/${reponame}/git/trees/${defaultBranch}?recursive=1`);

        const packageNodes = treeResponse.data.tree
            .filter(node => node.type === 'blob' && node.path.endsWith('package.json') && !node.path.includes('node_modules/'))
            .sort((a, b) => a.path.split('/').length - b.path.split('/').length)
            .slice(0, 5);

        if (packageNodes.length === 0) {
            return res.json({ message: "No package.json found", vulnerabilities: [] });
        }

        const allDependencies = await fetchAndMergeDependencies(githubApi, username, reponame, packageNodes);

        if (Object.keys(allDependencies).length === 0) {
            return res.json({ message: "No dependencies found to scan", vulnerabilities: [] });
        }

        const vulnerabilities = await checkOSVVulnerabilities(allDependencies);

        res.json({ repository: `${username}/${reponame}`, vulnerabilities });

    } catch (error) {
        console.error(`Error scanning ${username}/${reponame}:`, error.message);
        res.status(500).json({ error: "Failed to scan repository for vulnerabilities." });
    }
};


exports.scanAllReposVulnerabilities = async (req, res) => {
    try {
        const githubApi = await createGithubApi(req.session);
        const reposResponse = await githubApi.get(`/user/repos?per_page=100&affiliation=owner`);
        const repos = reposResponse.data;

        const scanResults = {};
        const BATCH_SIZE = 3;
        for (let i = 0; i < repos.length; i += BATCH_SIZE) {
            const batch = repos.slice(i, i + BATCH_SIZE);

            const batchPromises = batch.map(async (repo) => {
                try {
                    const defaultBranch = repo.default_branch;
                    const treeResponse = await githubApi.get(`/repos/${repo.owner.login}/${repo.name}/git/trees/${defaultBranch}?recursive=1`);

                    const packageNodes = treeResponse.data.tree
                        .filter(node => node.type === 'blob' && node.path.endsWith('package.json') && !node.path.includes('node_modules/'))
                        .sort((a, b) => a.path.split('/').length - b.path.split('/').length)
                        .slice(0, 5);

                    if (packageNodes.length === 0) return null;

                    const allDependencies = await fetchAndMergeDependencies(githubApi, repo.owner.login, repo.name, packageNodes);

                    if (Object.keys(allDependencies).length === 0) return null;
                    const vulns = await checkOSVVulnerabilities(allDependencies);

                    if (vulns.length > 0) {
                        scanResults[repo.name] = vulns;
                    }
                    return true;
                } catch (err) {
                    console.error(`Skipping ${repo.name} due to error:`, err.message);
                    return null;
                }
            });

            await Promise.all(batchPromises);
        }

        res.json({ totalReposScanned: repos.length, vulnerableRepos: scanResults });

    } catch (error) {
        console.error("Bulk scan error:", error.message);
        res.status(500).json({ error: "Failed to complete bulk vulnerability scan." });
    }
};


exports.fetchDependencyHealth = async (req, res) => {
    const { username, reponame } = req.params;
    const cacheKey = `repo:insights:dependencies:${username}:${reponame}`;

    try {
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            console.log(`Cache hit for dependency health: ${username}/${reponame}`);
            return res.json(JSON.parse(cachedData));
        }

        const githubApi = await createGithubApi(req.session);

        const repoDetails = await githubApi.get(`/repos/${username}/${reponame}`);
        const defaultBranch = repoDetails.data.default_branch;

        const treeResponse = await githubApi.get(`/repos/${username}/${reponame}/git/trees/${defaultBranch}?recursive=1`);
        const packageNodes = treeResponse.data.tree
            .filter(node => node.type === 'blob' && node.path.endsWith('package.json') && !node.path.includes('node_modules/'))
            .sort((a, b) => a.path.split('/').length - b.path.split('/').length)
            .slice(0, 5);

        if (packageNodes.length === 0) {
            return res.json({ error: "package.json not found in this repository." });
        }

        const allDependencies = await fetchAndMergeDependencies(githubApi, username, reponame, packageNodes);

        if (Object.keys(allDependencies).length === 0) {
            return res.json({ dependencies: [], summary: { total: 0, outdated: 0, deprecated: 0, licenses: [] } });
        }

        const dependencyEntries = Object.entries(allDependencies);
        const healthReport = [];

        for (let i = 0; i < dependencyEntries.length; i += BATCH_SIZE) {
            const batch = dependencyEntries.slice(i, i + BATCH_SIZE);
            const batchPromises = batch.map(async ([name, version]) => {
                try {
                    const npmResponse = await axios.get(`https://registry.npmjs.org/${name}`, {
                        timeout: 5000 // Add timeout to prevent hanging
                    });
                    const latestVersion = npmResponse.data['dist-tags'].latest;
                    const license = npmResponse.data.license || 'N/A';
                    const isDeprecated = !!npmResponse.data.deprecated;
                    const isOutdated = latestVersion !== version.replace(/[\^~>=<]/g, '');

                    return { name, version, latestVersion, license, isOutdated, isDeprecated };
                } catch (error) {
                    console.error(`Error fetching data for ${name}:`, error.message);
                    return { name, version, error: 'Package not found in npm registry' };
                }
            });

            const batchResults = await Promise.all(batchPromises);
            healthReport.push(...batchResults);
        }

        const summary = {
            total: healthReport.length,
            outdated: healthReport.filter(d => d.isOutdated && !d.error).length,
            deprecated: healthReport.filter(d => d.isDeprecated && !d.error).length,
            licenses: [...new Set(healthReport.filter(d => d.license).map(d => d.license))].sort((a, b) => a.localeCompare(b)) // guarantee unique and sorted licenses
        };

        const finalReport = { dependencies: healthReport, summary };

        await redisClient.set(cacheKey, JSON.stringify(finalReport), { EX: 3600 * 6 });
        res.json(finalReport);

    } catch (error) {
        console.error("Error fetching dependency health:", error.response?.data || error.message);
        res.status(error.response?.status || 500).json({ message: "Error fetching dependency health." });
    }
};

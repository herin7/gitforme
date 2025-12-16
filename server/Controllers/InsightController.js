const axios = require('axios');
const User = require('../models/UserModel');
const redisClient = require('../util/RediaClient');
const { createGithubApi } = require('../util/GithubApiHelper');

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
        const packageJsonNode = treeResponse.data.tree.find(node => node.path.endsWith('package.json'));

        if (!packageJsonNode) {
            return res.json({ error: "package.json not found in this repository." });
        }
        
        let packageJsonContent;
        try {
            const packageJsonResponse = await githubApi.get(`/repos/${username}/${reponame}/contents/${packageJsonNode.path}`);
            packageJsonContent = JSON.parse(Buffer.from(packageJsonResponse.data.content, 'base64').toString());
        } catch (error) {
            console.error("Error reading package.json:", error.message);
            return res.json({ error: "Could not read the package.json file." });
        }
        
        const dependencies = { ...packageJsonContent.dependencies, ...packageJsonContent.devDependencies };
        if (Object.keys(dependencies).length === 0) {
            return res.json({ dependencies: [], summary: { total: 0, outdated: 0, deprecated: 0, licenses: [] } });
        }

        // Batch dependency checks with concurrency control to avoid overwhelming npm registry
        const CONCURRENCY_LIMIT = 10;
        const dependencyEntries = Object.entries(dependencies);
        const healthReport = [];

        for (let i = 0; i < dependencyEntries.length; i += CONCURRENCY_LIMIT) {
            const batch = dependencyEntries.slice(i, i + CONCURRENCY_LIMIT);
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

// server/api/osvApi.js
const axios = require('axios');

const checkOSVVulnerabilities = async (dependenciesObj) => {
    if (!dependenciesObj || Object.keys(dependenciesObj).length === 0) {
        return [];
    }

    // OSV expects exact versions. Strip npm prefixes like ^, ~, >=
    const queries = Object.entries(dependenciesObj).map(([name, version]) => {
        const cleanVersion = version.replace(/[\^~>=<]/g, '');
        return {
            package: { name, ecosystem: 'npm' },
            version: cleanVersion
        };
    });

    try {
        const response = await axios.post('https://api.osv.dev/v1/querybatch', { queries });
        const results = response.data.results || [];
        const vulnerablePackages = [];

        results.forEach((res, index) => {
            if (res.vulns && res.vulns.length > 0) {
                vulnerablePackages.push({
                    package: queries[index].package.name,
                    version: queries[index].version,
                    vulnerabilities: res.vulns.map(v => ({
                        id: v.id,
                        summary: v.summary || 'No summary available.',
                        severity: v.database_specific?.severity || 'UNKNOWN',
                        details: v.details || ''
                    }))
                });
            }
        });

        return vulnerablePackages;
    } catch (error) {
        console.error("OSV API Error:", error.message);
        throw new Error("Failed to fetch vulnerability data from OSV.");
    }
};

module.exports = { checkOSVVulnerabilities };
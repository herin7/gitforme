
export const DependencyDashboard = ({ dependencyHealth }) => {
    if (dependencyHealth === null) {
        return <p className="text-gray-500 p-4 text-lg">Loading dependency health...</p>;
    }
    if (dependencyHealth.error) {
        return <p className="text-red-500 p-4 text-lg">{dependencyHealth.error}</p>;
    }

    const { dependencies, summary } = dependencyHealth;
    const outdatedDeps = dependencies.filter(d => d.isOutdated && !d.error);
    const deprecatedDeps = dependencies.filter(d => d.isDeprecated && !d.error);

    return (
        <div className="p-4 space-y-6">
            <h3 className="text-2xl font-bold">Dependency Health</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#FEF9F2] p-4 border-2 border-black rounded-lg"><p className="text-base text-gray-600">Total Dependencies</p><p className="text-3xl font-bold">{summary.total}</p></div>
                <div className={`p-4 border-2 border-black rounded-lg ${summary.outdated > 0 ? 'bg-yellow-100' : 'bg-green-100'}`}><p className="text-base text-gray-600">Outdated</p><p className="text-3xl font-bold">{summary.outdated}</p></div>
                <div className={`p-4 border-2 border-black rounded-lg ${summary.deprecated > 0 ? 'bg-red-200' : 'bg-green-100'}`}><p className="text-base text-gray-600">Deprecated</p><p className="text-3xl font-bold">{summary.deprecated}</p></div>
            </div>

            {deprecatedDeps.length > 0 && (
                <div>
                    <h4 className="font-bold text-xl mb-2 text-red-700">🚨 Deprecated Packages</h4>
                    <ul className="space-y-2">
                        {deprecatedDeps.map(dep => (
                            <li key={dep.name} className="p-3 bg-red-50 border border-red-300 rounded-lg">
                                <p className="font-semibold text-lg">{dep.name}</p>
                                <p className="text-base text-red-600">This package is deprecated and should be replaced.</p>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {outdatedDeps.length > 0 && (
                <div>
                    <h4 className="font-bold text-xl mb-2 text-yellow-700">⚠️ Outdated Packages</h4>
                    <div className="overflow-x-auto border-2 border-black rounded-lg">
                        <table className="w-full text-base text-left">
                            <thead className="bg-gray-100 border-b-2 border-black">
                                <tr>
                                    <th className="p-3">Package</th><th className="p-3">Current</th><th className="p-3">Latest</th>
                                </tr>
                            </thead>
                            <tbody>
                                {outdatedDeps.map(dep => (
                                    <tr key={dep.name} className="border-b last:border-b-0 even:bg-yellow-50">
                                        <td className="p-3 font-semibold">{dep.name}</td>
                                        <td className="p-3 font-mono">{dep.version}</td>
                                        <td className="p-3 font-mono text-green-700 font-bold">{dep.latestVersion}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div>
                <h4 className="font-bold text-xl mb-2">License Summary</h4>
                <div className="flex flex-wrap gap-2">
                    {summary.licenses.length > 0 ? summary.licenses.map(license => (
                        <span key={license} className="px-3 py-1 bg-gray-200 text-gray-800 rounded-full text-sm font-semibold">{license}</span>
                    )) : <p className="text-base text-gray-500">No license information found.</p>}
                </div>
            </div>
        </div>
    );
};


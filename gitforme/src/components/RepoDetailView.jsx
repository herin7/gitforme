/*
File: gitforme/src/components/RepoDetailView.jsx
*/
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Import the new component
import GitHistoryTimeline from './GitHistoryTimeline';

// Assuming these are your actual, fully implemented components
import { FileGraph } from './FileGraph';
import { DirectoryStructure } from './DirectoryStructure';
import { Icon } from './Iconsfile';
import { FullPageLoader, SkeletonLoader } from '../../Loaders/SkeletonLoader';
import { FileHistoryPanel } from './FileHistoryPanel';
import { FileContentModal } from '../PageContent/FileContentModal';
import { RepoHeaderCard } from '../cards/RepoHeaderCard';
import { AccordionCard } from '../cards/AccordionCard';
import { ContributorsList } from './ContributorList';
import { IssuesView } from './RepoIssues';
import { InsightsView } from './InsightsView';
import { FeatureStoryModal } from './FeatureStoryModal';
import { ReportModal } from './ReportModal';
import { GoodFirstIssues } from '../cards/GoodFirstIssues';
import { DependencyDashboard } from './DependencyDashboard';


const copyToClipboard = (text) => {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text)
            .then(() => toast.success("Context copied to clipboard!"))
            .catch(() => toast.error("Failed to copy using modern API."));
    } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                toast.success("Context copied to clipboard!");
            } else {
                toast.error("Fallback copy command failed.");
            }
        } catch (err) {
            toast.error("An error occurred during fallback copy.");
        }
        document.body.removeChild(textArea);
    }
};

const buildHierarchy = (flatList) => {
    if (!flatList || flatList.length === 0) return [];
    const tree = [];
    const map = new Map();

    flatList.forEach(node => {
        const name = node.path.split('/').pop();
        map.set(node.path, { ...node, name, children: [] });
    });

    map.forEach(node => {
        const parentPath = node.path.substring(0, node.path.lastIndexOf('/'));
        const parent = map.get(parentPath);
        if (parent) {
            parent.children.push(node);
        } else {
            tree.push(node);
        }
    });

    map.forEach(node => {
        if (node.children.length === 0 && node.type === 'blob') {
            delete node.children;
        }
    });

    return tree;
};


const RepoDetailView = ({ onApiError, onRateLimitExceeded, onApiDown }) => {
    const { username, reponame } = useParams();

    // State management for all repository data and UI status
    const [repoData, setRepoData] = useState({});
    const [readmeContent, setReadmeContent] = useState('');
    const [hierarchicalTree, setHierarchicalTree] = useState([]);
    const [flatTree, setFlatTree] = useState([]);
    const [contributors, setContributors] = useState([]);
    const [deployments, setDeployments] = useState([]);
    const [issues, setIssues] = useState({ open: [], closed: [] });
    const [goodFirstIssues, setGoodFirstIssues] = useState([]);
    const [insights, setInsights] = useState(null);
    const [hotspots, setHotspots] = useState([]);
    const [dependencyHealth, setDependencyHealth] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('directory');
    const [focusedNode, setFocusedNode] = useState(null);
    const [selectedFileForHistory, setSelectedFileForHistory] = useState(null);
    const [commitHistory, setCommitHistory] = useState([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [modalState, setModalState] = useState({ isOpen: false, content: '', fileName: '', fileUrl: '' });
    const [storyModalIssue, setStoryModalIssue] = useState(null);
    const [llmContext, setLlmContext] = useState('');
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportContent, setReportContent] = useState('');
    const [isReportLoading, setIsReportLoading] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [timelineData, setTimelineData] = useState(null);
    const [isTimelineLoading, setIsTimelineLoading] = useState(true);
    
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const apiServerUrl = import.meta.env.VITE_API_URL;
                const apiBase = `${apiServerUrl}/api/github/${username}/${reponame}`;

                const repoRes = await axios.get(apiBase, { withCredentials: true });
                const defaultBranch = repoRes.data.default_branch || 'main';

                const results = await Promise.allSettled([
                    axios.get(`${apiBase}/readme`, { withCredentials: true }),
                    axios.get(`${apiBase}/git/trees/${defaultBranch}?recursive=1`, { withCredentials: true }),
                    axios.get(`${apiBase}/contributors`, { withCredentials: true }),
                    axios.get(`${apiBase}/deployments`, { withCredentials: true }),
                    axios.get(`${apiBase}/issues`, { withCredentials: true }),
                    axios.get(`${apiBase}/good-first-issues`, { withCredentials: true }),
                    axios.get(`${apiBase}/insights`, { withCredentials: true }),
                    axios.get(`${apiBase}/hotspots`, { withCredentials: true }),
                    axios.get(`${apiBase}/insights/dependencies`, { withCredentials: true }),
                    axios.get(`${apiBase}/timeline`, { withCredentials: true }) ,
                ]);

                const getData = (result, defaultValue) => result.status === 'fulfilled' ? result.value.data : defaultValue;

                setRepoData(repoRes.data);
                const readmeData = getData(results[0], { content: '' });
                setReadmeContent(readmeData.content ? atob(readmeData.content) : '# No README found');
                const treeData = getData(results[1], { tree: [] }).tree || [];
                setFlatTree(treeData);
                setHierarchicalTree(buildHierarchy(treeData));
                setContributors(getData(results[2], []));
                setTimelineData(getData(results[9], null));
                setIsTimelineLoading(false);

                let deploymentsData = getData(results[3], []);
                if (!Array.isArray(deploymentsData)) {
                    deploymentsData = [];
                }
                setIssues(getData(results[4], { open: [], closed: [] }));
                setGoodFirstIssues(getData(results[5], []));
                setInsights(getData(results[6], null));
                setHotspots(getData(results[7], []));
                setDependencyHealth(getData(results[8], null));

                const activeDeployments = [];
                if (repoRes.data.homepage) {
                    activeDeployments.push({ url: repoRes.data.homepage, environment: 'Homepage' });
                }
                if (deploymentsData.length > 0) {
                    deploymentsData.forEach(dep => {
                        if (!activeDeployments.some(d => d.url === dep.url)) {
                            activeDeployments.push(dep);
                        }
                    });
                }
                setDeployments(activeDeployments);

            } catch (err) {
                let errorMessage = 'An unexpected error occurred.';
                let isRateLimit = false;
                let isApiDown = false;
                if (axios.isAxiosError(err)) {
                    if (!err.response) {
                        errorMessage = 'The backend server or GitHub API is currently unreachable.';
                        isApiDown = true;
                    } else {
                        switch (err.response.status) {
                            case 404:
                                errorMessage = `Repository not found. Please ensure '${username}/${reponame}' is a valid public repository.`;
                                break;
                            case 403:
                                if (err.response.data && typeof err.response.data.message === 'string' && err.response.data.message.toLowerCase().includes('rate limit')) {
                                    errorMessage = 'GitHub API rate limit exceeded. Please try again later or log in with GitHub for higher limits.';
                                    isRateLimit = true;
                                } else {
                                    errorMessage = 'Access forbidden. This could be due to GitHub API rate limits or repository permissions. Please try again later.';
                                }
                                break;
                            case 401:
                                errorMessage = 'Authentication error. Please ensure you are logged in and have the necessary permissions.';
                                break;
                            default:
                                errorMessage = `Failed to fetch repository data. Server responded with status ${err.response.status}.`;
                        }
                    }
                } else if (err instanceof Error) {
                    errorMessage = err.message;
                }
                setError(errorMessage);
                toast.error(errorMessage);
                if (isRateLimit && typeof onRateLimitExceeded === 'function') {
                    onRateLimitExceeded();
                }
                if (isApiDown && typeof onApiDown === 'function') {
                    onApiDown();
                }
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [username, reponame]);

    const handleFileSelect = useCallback(async (fileNode) => {
        if (fileNode.type === 'tree') {
            setFocusedNode(fileNode);
            return;
        }
        const apiServerUrl = import.meta.env.VITE_API_URL;
        const apiBase = `${apiServerUrl}/api/github/${username}/${reponame}`;

        try {
            const contentRes = await axios.get(`${apiBase}/contents/${fileNode.path}`, {
                withCredentials: true,
            });
            const fileUrl = `https://github.com/${username}/${reponame}/blob/HEAD/${fileNode.path}`;
            setModalState({ isOpen: true, content: contentRes.data, fileName: fileNode.path, fileUrl });
        } catch (err) {
            console.error("Failed to fetch file content:", err);
            toast.error("Could not load file content. It might be binary, too large, or empty.");
        }
        
        setSelectedFileForHistory({ ...fileNode, owner: username, repo: reponame });
        setIsHistoryLoading(true);
        setCommitHistory([]);

        try {
            const historyRes = await axios.get(`${apiBase}/commits`, {
                params: { path: fileNode.path },
                withCredentials: true,
            });
            setCommitHistory(historyRes.data);
        } catch (err) {
            console.error("Failed to fetch commit history:", err);
            toast.error("Could not load commit history for this file.");
        } finally {
            setIsHistoryLoading(false);
        }
    }, [username, reponame]);

    const formatDuration = (ms) => {
        if (ms === null || ms === undefined) return 'N/A';
        const days = Math.floor(ms / (1000 * 60 * 60 * 24));
        const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        return `${days}d ${hours}h`;
    };
    const handleCommitSelect = async (commit) => {
        console.log("Selected commit from timeline:", commit);
    };

    const handleAddSingleIssueToContext = (issue) => {
        const issueContext = `
--- ISSUE #${issue.number}: ${issue.title} ---
State: ${issue.state}
URL: ${issue.html_url}
BODY: ${issue.body || 'No description.'}
----------------------------------
`;
        setLlmContext(prev => prev + issueContext);
        toast.success(`Added Issue #${issue.number} to context!`);
    };

    const handleAddFullStoryToContext = (fullContext) => {
        setLlmContext(prev => prev + fullContext);
        toast.success("Full feature story added to context!");
    };

    const handleFastClone = () => {
        const url = `vscode://vscode.git/clone?url=https://github.com/${username}/${reponame}`;
        window.location.href = url;
        toast.info('Launching VS Code to clone repository...');
    };

    const handleGenerateReport = () => {
        setIsReportLoading(true);
        setIsReportModalOpen(true);
        
        let md = `# 📊 Repository Report: ${repoData.full_name}\n\n`;
        md += `_${repoData.description}_\n\n`;
        md += `**URL:** [${repoData.html_url}](${repoData.html_url})\n`;
        md += `**Language:** ${repoData.language} | **Stars:** ${repoData.stargazers_count?.toLocaleString()} | **Forks:** ${repoData.forks_count?.toLocaleString()}\n\n`;

        md += `## 🚀 Key Insights\n`;
        if (insights) {
            md += `- **Average PR Merge Time:** ${formatDuration(insights.averageMergeTime)}\n`;
            md += `- **PR Acceptance Rate:** ${insights.acceptanceRate || '0'}%\n`;
            md += `_Based on the last ${insights.totalClosed || 0} closed PRs._\n\n`;
        } else {
            md += `_No PR insights available._\n\n`;
        }

        md += `## 🔥 Code Hotspots (Top 5)\n`;
        if (hotspots && hotspots.length > 0) {
            [...hotspots].sort((a, b) => b.churn - a.churn).slice(0, 5).forEach(h => { md += `- **${h.path}** (${h.churn} changes)\n`; });
        } else {
            md += `_No hotspot data available._\n\n`;
        }
        
        setReportContent(md);
        setIsReportLoading(false);
    };

    const handleCreateSuperContext = () => {
        toast.info("Generating Super Context...");
        let context = `## 🚀 Repository Overview: ${repoData.full_name}\n`;
        context += `**Description:** ${repoData.description}\n`;
        context += `**Primary Language:** ${repoData.language}\n\n`;

        if (hotspots && hotspots.length > 0) {
            context += `## 🔥 Code Hotspots (Most Changed Files)\n`;
            [...hotspots].sort((a, b) => b.churn - a.churn).slice(0, 10).forEach(h => { context += `- ${h.path} (${h.churn} changes)\n`; });
            context += `\n`;
        }

        if (flatTree && flatTree.length > 0) {
            context += `## 📁 File Structure\n`;
            context += flatTree.map(file => `- ${file.path}`).join('\n') + '\n\n';
        }
        
        if (readmeContent) {
            context += `## 📄 README.md\n`;
            context += '```\n' + readmeContent + '\n```\n';
        }

        setLlmContext(context);
        toast.success("Super Context created and ready to copy!");
    };


    if (isLoading) return <FullPageLoader />;

    if (error) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4 text-center font-sans">
            <div className="bg-white border-2 border-red-400 rounded-xl shadow-[8px_8px_0px_rgba(239,68,68,0.5)] p-8 max-w-lg w-full">
                <div className="text-5xl mb-4">🚫</div>
                <h2 className="text-3xl font-bold text-red-600 mb-3">Oops! Something Went Wrong</h2>
                <p className="text-gray-700 text-lg mb-6 bg-red-50 p-3 border border-red-200 rounded-lg">{error}</p>
                <div className="text-left bg-gray-100 p-4 rounded-lg border border-gray-300">
                    <h3 className="font-bold text-gray-800 mb-2">Troubleshooting Tips:</h3>
                    <ul className="list-disc list-inside text-gray-600 space-y-2">
                        <li>Ensure the repository is public. This tool does not support private repositories.</li>
                        <li>Double-check the username and repository name in the URL.</li>
                        <li>For the best experience, we recommend using the Google Chrome browser,If you are facing Login issues in Brave try chrome</li>
                        <li>If the issue persists, it might be a temporary problem with the GitHub API. Please try again later.</li>
                    </ul>
                </div>
            </div>
        </div>
    );

    if (!Array.isArray(hierarchicalTree) || hierarchicalTree.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4 text-center font-sans">
                <div className="bg-white border-2 border-yellow-400 rounded-xl shadow-[8px_8px_0px_rgba(251,191,36,0.5)] p-8 max-w-lg w-full">
                    <div className="text-5xl mb-4">📁</div>
                    <h2 className="text-3xl font-bold text-yellow-600 mb-3">No file structure found</h2>
                    <p className="text-gray-700 text-lg mb-6 bg-yellow-50 p-3 border border-yellow-200 rounded-lg">This repository may be empty, or there was a problem fetching its contents.</p>
                </div>
            </div>
        );
    }

    const TabButton = ({ name, label }) => (
        <button onClick={() => setActiveTab(name)} className={`font-bold py-3 px-5 transition-colors duration-200 relative text-lg ${activeTab === name ? 'text-black' : 'text-gray-500 hover:text-black'}`}>
            {label}
            {activeTab === name && <div className="absolute bottom-0 left-0 right-0 h-1 bg-black rounded-t-full"></div>}
        </button>
    );

    return (
        <div className="w-full max-w-screen-2xl mx-auto p-4 md:p-8 bg-gray-50 min-h-screen font-sans text-gray-800">
            <ToastContainer theme="dark" position="bottom-right" />
            {modalState.isOpen && <FileContentModal {...modalState} onClose={() => setModalState({ ...modalState, isOpen: false })} />}
            <FileHistoryPanel file={selectedFileForHistory} history={commitHistory} isLoading={isHistoryLoading} onClose={() => setSelectedFileForHistory(null)} />
            {storyModalIssue && <FeatureStoryModal issue={storyModalIssue} username={username} reponame={reponame} onClose={() => setStoryModalIssue(null)} onAddContext={handleAddFullStoryToContext} />}
            <ReportModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} reportContent={reportContent} isLoading={isReportLoading} />

            <RepoHeaderCard {...{ username, reponame, repoData, deployments, onFastClone: handleFastClone, onGenerateReport: handleGenerateReport, isReportLoading, onAiChatClick: () => setIsChatOpen(true) }} />

            <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <div className="bg-white border-2 border-black rounded-xl shadow-[8px_8px_0px_rgba(0,0,0,1)] h-full flex flex-col">
                        <div className="flex border-b-2 border-black mb-1 flex-shrink-0 flex-wrap">
                            <TabButton name="directory" label="Directory" />
                            <TabButton name="graph" label="File Map" />
                            {/* THIS IS THE MISSING BUTTON */}
                            <TabButton name="timeline" label="Timeline" />
                            <TabButton name="issues" label="Issues" />
                            <TabButton name="insights" label="Insights" />
                        </div>
                        <div className="flex-grow overflow-y-auto p-2 sm:p-4 min-h-[40rem]">
                            {activeTab === 'directory' && <DirectoryStructure tree={hierarchicalTree} onFileSelect={handleFileSelect} hotspots={hotspots} />}
                            {activeTab === 'graph' && <FileGraph treeData={flatTree} onFileSelect={handleFileSelect} onFolderSelect={setFocusedNode} focusedNode={focusedNode} hotspots={hotspots} />}
                            {activeTab === 'timeline' && (
                                isTimelineLoading 
                                ? <SkeletonLoader /> 
                                : <GitHistoryTimeline timelineData={timelineData} onCommitSelect={handleCommitSelect} />
                            )}
                            {activeTab === 'issues' && <IssuesView issues={issues} onAddContext={handleAddSingleIssueToContext} onShowStory={setStoryModalIssue} />}
                            {activeTab === 'insights' && (
                                <div>
                                    <InsightsView insights={insights} />
                                    <div className="my-6 border-t-2 border-dashed border-gray-300"></div>
                                    <DependencyDashboard dependencyHealth={dependencyHealth} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-1 flex flex-col gap-8">
                    <div className="bg-white p-4 sm:p-6 border-2 border-black rounded-xl shadow-[8px_8px_0px_rgba(0,0,0,1)]">
                        <h3 className="font-bold text-xl border-b-2 border-black mb-4 pb-2">LLM Context Builder</h3>
                        <textarea
                            value={llmContext}
                            onChange={(e) => setLlmContext(e.target.value)}
                            placeholder="Click 'Add Context' on an issue or 'Create Super Context' to start building a prompt..."
                            className="w-full h-48 p-3 bg-[#FEF9F2] border-2 border-gray-400 rounded-lg resize-none font-mono text-base focus:ring-amber-500 focus:border-amber-500"
                        />
                        <div className="mt-2 flex flex-col sm:flex-row gap-2">
                            <button
                                onClick={handleCreateSuperContext}
                                className="w-full px-4 py-3 bg-amber-400 text-black font-bold rounded-lg border-2 border-black hover:bg-amber-500 transition-colors text-base"
                            >
                                ✨ Create Super Context
                            </button>
                            <button
                                onClick={() => copyToClipboard(llmContext)}
                                disabled={!llmContext}
                                className="w-full px-4 py-3 bg-black text-white font-bold rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed text-base"
                            >
                                Copy Context
                            </button>
                        </div>
                    </div>

                    <AccordionCard title={`Find an Issue to Work On (${goodFirstIssues.length})`} icon="🌱" defaultOpen={true}>
                        <GoodFirstIssues issues={goodFirstIssues} />
                    </AccordionCard>

                    <AccordionCard title={`Contributors (${contributors.length})`} icon="👥" defaultOpen={false}>
                        <ContributorsList contributors={contributors} />
                    </AccordionCard>

                    <AccordionCard title="README.md" icon="📄" defaultOpen={false}>
                        <div className="prose prose-lg max-w-none overflow-y-auto max-h-[60vh] bg-[#FEF9F2] p-4 rounded-lg border-2 border-gray-200">
                            <ReactMarkdown>{readmeContent}</ReactMarkdown>
                        </div>
                    </AccordionCard>
                </div>
            </div>
        </div>
    );
};

export default RepoDetailView;

import React, { useState, useEffect, useMemo } from 'react';
import apiClient from '../api/axiosConfig';
import ReactMarkdown from 'react-markdown';
import {  toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { SkeletonLoader } from '../../Loaders/SkeletonLoader';

export const FeatureStoryModal = ({ issue, username, reponame, onClose, onAddContext }) => {
    const [timeline, setTimeline] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchTimeline = async () => {
            setIsLoading(true);
            try {
                const apiServerUrl = import.meta.env.VITE_API_URL;
                
                const response = await apiClient.get(`${apiServerUrl}/api/github/${username}/${reponame}/issues/${issue.number}/timeline`, { withCredentials: true });
                setTimeline(response.data);
            } catch (error) {
                toast.error("Could not load feature timeline.");
                console.error("Failed to fetch timeline:", error);
            }
            setIsLoading(false);
        };
        fetchTimeline();
    }, [issue, username, reponame]);

    const linkedPR = useMemo(() => {
        return timeline.find(event => event.event === 'cross-referenced' && event.source?.issue?.pull_request);
    }, [timeline]);

    const handleAddFullContext = () => {
        let fullContext = `
--- ISSUE #${issue.number}: ${issue.title} ---
State: ${issue.state}
Author: ${issue.user.login}
URL: ${issue.html_url}

BODY:
${issue.body || 'No description provided.'}
`;
        if (linkedPR) {
            fullContext += `
--- LINKED PULL REQUEST #${linkedPR.source.issue.number}: ${linkedPR.source.issue.title} ---
State: ${linkedPR.source.issue.state}
Author: ${linkedPR.source.issue.user.login}
URL: ${linkedPR.source.issue.html_url}
`;
        }
        fullContext += "\n----------------------------------\n";
        onAddContext(fullContext);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={onClose}>
            <div className="bg-white p-6 border-2 border-black rounded-xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-[8px_8px_0px_rgba(0,0,0,1)]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4 pb-4 border-b-2 border-black">
                    <h3 className="font-bold text-2xl">Feature Story</h3>
                    <button onClick={onClose} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-base font-bold border-2 border-red-700">Close</button>
                </div>
                <div className="overflow-y-auto space-y-4 p-1">
                    <div className="p-4 border-2 border-black rounded-lg bg-gray-50">
                        <h4 className="font-bold text-xl">ISSUE: #{issue.number} - {issue.title}</h4>
                        <div className="prose prose-lg max-w-none mt-2">
                           <ReactMarkdown>{issue.body || "No description."}</ReactMarkdown>
                        </div>
                    </div>
                    <div className="text-center text-3xl font-bold text-gray-400">↓</div>
                    <div className="p-4 border-2 border-black rounded-lg bg-blue-50">
                        <h4 className="font-bold text-xl">PULL REQUEST</h4>
                        {isLoading ? (
                             <div className="space-y-2 mt-2">
                                <SkeletonLoader className="h-5 w-3/4" />
                                <SkeletonLoader className="h-4 w-1/2" />
                            </div>
                        ) : (
                            linkedPR ? (
                                <div>
                                    <a href={linkedPR.source.issue.html_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-semibold text-lg">
                                        #{linkedPR.source.issue.number} - {linkedPR.source.issue.title}
                                    </a>
                                    <p className="text-base">State: <span className={`font-semibold ${linkedPR.source.issue.state === 'closed' ? 'text-red-600' : 'text-green-600'}`}>{linkedPR.source.issue.state}</span></p>
                                </div>
                            ) : <p className="text-base">No linked Pull Request found in timeline.</p>
                        )}
                    </div>
                </div>
                 <button onClick={handleAddFullContext} className="mt-4 w-full px-4 py-3 bg-amber-400 text-black font-bold rounded-lg border-2 border-black hover:bg-amber-500 transition-colors text-lg">
                    Add Full Story to Context
                </button>
            </div>
        </div>
    );
};

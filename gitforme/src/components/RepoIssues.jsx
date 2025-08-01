import React, { useState } from 'react';

export const IssuesView = ({ issues, onAddContext, onShowStory }) => {
    const [filter, setFilter] = useState('open');
    const filteredIssues = issues[filter] || [];
    return (
        <div>
            <div className="flex items-center gap-2 mb-4 border-b-2 border-gray-200 pb-4">
                <button onClick={() => setFilter('open')} className={`px-4 py-2 text-base font-bold rounded-lg border-2 transition-colors ${filter === 'open' ? 'bg-black text-white border-black' : 'bg-white text-black border-black hover:bg-gray-100'}`}>Open ({issues.open?.length || 0})</button>
                <button onClick={() => setFilter('closed')} className={`px-4 py-2 text-base font-bold rounded-lg border-2 transition-colors ${filter === 'closed' ? 'bg-black text-white border-black' : 'bg-white text-black border-black hover:bg-gray-100'}`}>Closed ({issues.closed?.length || 0})</button>
            </div>
            <ul className="space-y-3">
                {filteredIssues.length > 0 ? filteredIssues.map(issue => (
                    <li key={issue.id} className="p-4 bg-[#FEF9F2] border-2 border-black rounded-lg">
                        <div className="flex justify-between items-start gap-4">
                            <div className="flex-grow">
                                <a href={issue.html_url} target="_blank" rel="noopener noreferrer" className="font-bold text-xl hover:text-amber-700">{issue.title}</a>
                                <p className="text-base text-gray-600">#{issue.number} opened by {issue.user.login}</p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0 mt-1 flex-wrap items-start sm:items-center">
                                <button onClick={() => onShowStory(issue)} className="px-3 py-1 bg-blue-200 text-blue-800 text-sm font-semibold border-2 border-blue-800 rounded-lg hover:bg-blue-300 transition-colors whitespace-nowrap">View Story</button>
                                <button onClick={() => onAddContext(issue)} className="px-3 py-1 bg-amber-200 text-amber-800 text-sm font-semibold border-2 border-amber-800 rounded-lg hover:bg-amber-300 transition-colors whitespace-nowrap">Add Context</button>
                            </div>
                        </div>
                    </li>
                )) : <p className="text-gray-500 text-center py-8 text-lg">No {filter} issues found.</p>}
            </ul>
        </div>
    );
};
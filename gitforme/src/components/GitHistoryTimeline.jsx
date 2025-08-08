import React from 'react';
import { formatDistanceToNow } from 'date-fns';

const GitHistoryTimeline = ({ timelineData, onCommitSelect }) => {
  if (!timelineData || !timelineData.commits) {
    return <div className="p-4 text-gray-500">No timeline data available</div>;
  }

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-xl font-bold mb-4">Repository Timeline</h2>
      
      {/* Branches section */}
      {timelineData.branches && timelineData.branches.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold mb-2">Branches</h3>
          <div className="flex flex-wrap gap-2">
            {timelineData.branches.map(branch => (
              <span key={branch.name} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                {branch.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tags section */}
      {timelineData.tags && timelineData.tags.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold mb-2">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {timelineData.tags.map(tag => (
              <span key={tag.name} className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-sm">
                v{tag.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Commits timeline */}
      <div className="space-y-4">
        <h3 className="font-semibold">Recent Commits</h3>
        <div className="space-y-4">
          {timelineData.commits.slice(0, 20).map(commit => (
            <div 
              key={commit.sha} 
              className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
              onClick={() => onCommitSelect(commit)}
            >
              <div className="flex items-start gap-3">
                {commit.author.avatar_url && (
                  <img 
                    src={commit.author.avatar_url} 
                    alt={commit.author.name} 
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium">{commit.message.split('\n')[0]}</h4>
                    {commit.tag && (
                      <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs">
                        {commit.tag}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    <span>{commit.author.login || commit.author.name}</span>
                    <span className="mx-2">•</span>
                    <span>{formatDistanceToNow(new Date(commit.date), { addSuffix: true })}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GitHistoryTimeline;
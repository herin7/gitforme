"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchRepoInsights = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
async function fetchRepoInsights(repoUrl) {
    // Replace with your actual backend endpoint
    const apiEndpoint = 'https://www.gitforme.tech/api/github/insights';
    try {
        const response = await (0, node_fetch_1.default)(apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ repoUrl })
        });
        if (!response.ok) {
            throw new Error('Failed to fetch insights');
        }
        const data = await response.json();
        // You can format the data here as needed
        return JSON.stringify(data, null, 2);
    }
    catch (err) {
        return `Error: ${err.message}`;
    }
}
exports.fetchRepoInsights = fetchRepoInsights;

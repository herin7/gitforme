"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenManager = void 0;
exports.parseGitHubUrl = parseGitHubUrl;
exports.loginWithGitHub = loginWithGitHub;
exports.logout = logout;
exports.verifyToken = verifyToken;
exports.getCurrentUser = getCurrentUser;
exports.fetchRepoData = fetchRepoData;
exports.fetchRepoInsights = fetchRepoInsights;
exports.fetchRepoIssues = fetchRepoIssues;
exports.fetchRepoContributors = fetchRepoContributors;
exports.fetchGoodFirstIssues = fetchGoodFirstIssues;
const node_fetch_1 = __importDefault(require("node-fetch"));
const vscode = __importStar(require("vscode"));
// Configuration - change this to your actual server URL
// For local development: 'http://localhost:3000/api/github'
// For production: 'https://your-deployed-server.com/api/github'
const API_BASE_URL = 'http://localhost:3000/api/github';
const AUTH_BASE_URL = 'http://localhost:3000/api/auth';
function parseGitHubUrl(url) {
    try {
        // Handle various GitHub URL formats
        const cleanUrl = url.replace(/\.git$/, '');
        // Match patterns like:
        // https://github.com/username/repo
        // github.com/username/repo
        // username/repo
        const patterns = [
            /(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/]+)\/([^\/\s]+)/,
            /^([^\/\s]+)\/([^\/\s]+)$/
        ];
        for (const pattern of patterns) {
            const match = cleanUrl.match(pattern);
            if (match) {
                return {
                    username: match[1],
                    reponame: match[2].replace(/\.git$/, '')
                };
            }
        }
        throw new Error('Invalid GitHub URL format');
    }
    catch (error) {
        throw new Error('Failed to parse GitHub URL');
    }
}
// Token management
class TokenManager {
    static async getToken() {
        return await vscode.workspace.getConfiguration('gitforme').get('authToken');
    }
    static async setToken(token) {
        await vscode.workspace.getConfiguration('gitforme').update('authToken', token, vscode.ConfigurationTarget.Global);
    }
    static async clearToken() {
        await vscode.workspace.getConfiguration('gitforme').update('authToken', undefined, vscode.ConfigurationTarget.Global);
        await vscode.workspace.getConfiguration('gitforme').update('user', undefined, vscode.ConfigurationTarget.Global);
    }
    static async getUser() {
        return await vscode.workspace.getConfiguration('gitforme').get('user');
    }
    static async setUser(user) {
        await vscode.workspace.getConfiguration('gitforme').update('user', user, vscode.ConfigurationTarget.Global);
    }
}
exports.TokenManager = TokenManager;
TokenManager.TOKEN_KEY = 'gitforme.authToken';
TokenManager.USER_KEY = 'gitforme.user';
// Authentication functions
async function loginWithGitHub() {
    try {
        // Add source parameter to identify VS Code extension requests
        const authUrl = `${AUTH_BASE_URL}/github?source=vscode`;
        // Open the GitHub OAuth URL in the browser
        await vscode.env.openExternal(vscode.Uri.parse(authUrl));
        // Show improved input box for user to paste the token
        const token = await vscode.window.showInputBox({
            prompt: '🔑 After GitHub login, you\'ll see a special token page. Copy the token and paste it here.',
            placeHolder: 'Paste your authentication token from the browser',
            ignoreFocusOut: true,
            validateInput: (value) => {
                if (!value) {
                    return 'Token is required';
                }
                if (value.length < 20) {
                    return 'Token seems too short. Make sure you copied the full token.';
                }
                if (!value.match(/^[A-Za-z0-9\-_\.]+$/)) {
                    return 'Token contains invalid characters. Please copy only the token.';
                }
                return null;
            }
        });
        if (!token) {
            vscode.window.showWarningMessage('Login cancelled');
            return false;
        }
        vscode.window.showInformationMessage('Verifying token...');
        // Verify the token
        const user = await verifyToken(token.trim());
        if (user) {
            await TokenManager.setToken(token.trim());
            await TokenManager.setUser(user);
            vscode.window.showInformationMessage(`✅ Successfully logged in as ${user.username}!`);
            return true;
        }
        else {
            vscode.window.showErrorMessage('❌ Invalid token. Please try again or check if you copied the complete token.');
            return false;
        }
    }
    catch (error) {
        vscode.window.showErrorMessage(`Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return false;
    }
}
async function logout() {
    await TokenManager.clearToken();
    vscode.window.showInformationMessage('Successfully logged out.');
}
async function verifyToken(token) {
    try {
        const response = await (0, node_fetch_1.default)(`${AUTH_BASE_URL}/verifyToken`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'GitForMe-VSCode-Extension'
            },
            body: JSON.stringify({ token })
        });
        if (!response.ok) {
            return null;
        }
        const data = await response.json();
        if (data.status && data.user) {
            return data.user;
        }
        return null;
    }
    catch (error) {
        console.error('Token verification failed:', error);
        return null;
    }
}
async function getCurrentUser() {
    const token = await TokenManager.getToken();
    if (!token) {
        return null;
    }
    const user = await TokenManager.getUser();
    if (user) {
        return user;
    }
    // Verify token and update user info
    const verifiedUser = await verifyToken(token);
    if (verifiedUser) {
        await TokenManager.setUser(verifiedUser);
        return verifiedUser;
    }
    // Token is invalid, clear it
    await TokenManager.clearToken();
    return null;
}
// API functions with authentication
async function makeAuthenticatedRequest(url, options = {}) {
    const token = await TokenManager.getToken();
    const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'GitForMe-VSCode-Extension',
        'X-Requested-With': 'XMLHttpRequest',
        'X-Application': 'gitforme',
        ...options.headers
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await (0, node_fetch_1.default)(url, {
        ...options,
        headers
    });
    if (response.status === 401) {
        // Token might be expired, clear it
        await TokenManager.clearToken();
        throw new Error('Authentication expired. Please log in again.');
    }
    return response;
}
async function fetchRepoData(username, reponame) {
    try {
        const url = `${API_BASE_URL}/${username}/${reponame}`;
        console.log('Fetching repo data from:', url);
        const response = await makeAuthenticatedRequest(url);
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Repository not found');
            }
            else if (response.status === 403) {
                throw new Error('API rate limit exceeded');
            }
            else if (response.status === 401) {
                throw new Error('Authentication required. Please log in.');
            }
            else if (response.status >= 500) {
                throw new Error('Server error - please try again later');
            }
            throw new Error(`Failed to fetch repository data: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        return data;
    }
    catch (error) {
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('An unknown error occurred while fetching repository data');
    }
}
async function fetchRepoInsights(username, reponame) {
    try {
        const url = `${API_BASE_URL}/${username}/${reponame}/insights`;
        console.log('Fetching repo insights from:', url);
        const response = await makeAuthenticatedRequest(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch insights: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        return data;
    }
    catch (error) {
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('An unknown error occurred while fetching insights');
    }
}
async function fetchRepoIssues(username, reponame) {
    try {
        const url = `${API_BASE_URL}/${username}/${reponame}/issues`;
        console.log('Fetching repo issues from:', url);
        const response = await makeAuthenticatedRequest(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch issues: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        return data;
    }
    catch (error) {
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('An unknown error occurred while fetching issues');
    }
}
async function fetchRepoContributors(username, reponame) {
    try {
        const url = `${API_BASE_URL}/${username}/${reponame}/contributors`;
        console.log('Fetching repo contributors from:', url);
        const response = await makeAuthenticatedRequest(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch contributors: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        return data;
    }
    catch (error) {
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('An unknown error occurred while fetching contributors');
    }
}
async function fetchGoodFirstIssues(username, reponame) {
    try {
        const url = `${API_BASE_URL}/${username}/${reponame}/good-first-issues`;
        console.log('Fetching good first issues from:', url);
        const response = await makeAuthenticatedRequest(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch good first issues: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        return data;
    }
    catch (error) {
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('An unknown error occurred while fetching good first issues');
    }
}

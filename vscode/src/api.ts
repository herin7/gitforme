import fetch from 'node-fetch';
import * as vscode from 'vscode';

// Configuration - change this to your actual server URL
// For local development: 'http://localhost:3000/api/github'
// For production: 'https://your-deployed-server.com/api/github'
const API_BASE_URL = 'http://localhost:3000/api/github';
const AUTH_BASE_URL = 'http://localhost:3000/api/auth';

export interface GitHubRepoData {
  id: number;
  name: string;
  full_name: string;
  description: string;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  language: string;
  created_at: string;
  updated_at: string;
  default_branch: string;
  owner: {
    login: string;
    avatar_url: string;
  };
}

export interface ParsedGitHubUrl {
  username: string;
  reponame: string;
}

export interface AuthUser {
  id: string;
  username: string;
  avatar_url: string;
  email?: string;
}

export function parseGitHubUrl(url: string): ParsedGitHubUrl {
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
  } catch (error) {
    throw new Error('Failed to parse GitHub URL');
  }
}

// Token management
export class TokenManager {
  private static readonly TOKEN_KEY = 'gitforme.authToken';
  private static readonly USER_KEY = 'gitforme.user';

  static async getToken(): Promise<string | undefined> {
    return await vscode.workspace.getConfiguration('gitforme').get('authToken');
  }

  static async setToken(token: string): Promise<void> {
    await vscode.workspace.getConfiguration('gitforme').update('authToken', token, vscode.ConfigurationTarget.Global);
  }

  static async clearToken(): Promise<void> {
    await vscode.workspace.getConfiguration('gitforme').update('authToken', undefined, vscode.ConfigurationTarget.Global);
    await vscode.workspace.getConfiguration('gitforme').update('user', undefined, vscode.ConfigurationTarget.Global);
  }

  static async getUser(): Promise<AuthUser | undefined> {
    return await vscode.workspace.getConfiguration('gitforme').get('user');
  }

  static async setUser(user: AuthUser): Promise<void> {
    await vscode.workspace.getConfiguration('gitforme').update('user', user, vscode.ConfigurationTarget.Global);
  }
}

// Authentication functions
export async function loginWithGitHub(): Promise<boolean> {
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
    } else {
      vscode.window.showErrorMessage('❌ Invalid token. Please try again or check if you copied the complete token.');
      return false;
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}

export async function logout(): Promise<void> {
  await TokenManager.clearToken();
  vscode.window.showInformationMessage('Successfully logged out.');
}

export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const response = await fetch(`${AUTH_BASE_URL}/verifyToken`, {
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

    const data = await response.json() as any;
    if (data.status && data.user) {
      return data.user;
    }
    
    return null;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
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
async function makeAuthenticatedRequest(url: string, options: any = {}): Promise<any> {
  const token = await TokenManager.getToken();
  
  const headers: any = {
    'Content-Type': 'application/json',
    'User-Agent': 'GitForMe-VSCode-Extension',
    'X-Requested-With': 'XMLHttpRequest',
    'X-Application': 'gitforme',
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
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

export async function fetchRepoData(username: string, reponame: string): Promise<GitHubRepoData> {
  try {
    const url = `${API_BASE_URL}/${username}/${reponame}`;
    console.log('Fetching repo data from:', url);
    
    const response = await makeAuthenticatedRequest(url);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Repository not found');
      } else if (response.status === 403) {
        throw new Error('API rate limit exceeded');
      } else if (response.status === 401) {
        throw new Error('Authentication required. Please log in.');
      } else if (response.status >= 500) {
        throw new Error('Server error - please try again later');
      }
      throw new Error(`Failed to fetch repository data: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as GitHubRepoData;
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred while fetching repository data');
  }
}

export async function fetchRepoInsights(username: string, reponame: string): Promise<any> {
  try {
    const url = `${API_BASE_URL}/${username}/${reponame}/insights`;
    console.log('Fetching repo insights from:', url);
    
    const response = await makeAuthenticatedRequest(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch insights: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred while fetching insights');
  }
}

export async function fetchRepoIssues(username: string, reponame: string): Promise<any> {
  try {
    const url = `${API_BASE_URL}/${username}/${reponame}/issues`;
    console.log('Fetching repo issues from:', url);
    
    const response = await makeAuthenticatedRequest(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch issues: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred while fetching issues');
  }
}

export async function fetchRepoContributors(username: string, reponame: string): Promise<any> {
  try {
    const url = `${API_BASE_URL}/${username}/${reponame}/contributors`;
    console.log('Fetching repo contributors from:', url);
    
    const response = await makeAuthenticatedRequest(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch contributors: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred while fetching contributors');
  }
}

export async function fetchGoodFirstIssues(username: string, reponame: string): Promise<any> {
  try {
    const url = `${API_BASE_URL}/${username}/${reponame}/good-first-issues`;
    console.log('Fetching good first issues from:', url);
    
    const response = await makeAuthenticatedRequest(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch good first issues: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred while fetching good first issues');
  }
}

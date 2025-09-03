import * as vscode from 'vscode';
import { fetchRepoData, parseGitHubUrl, loginWithGitHub, logout, getCurrentUser, AuthUser } from './api';

export function activate(context: vscode.ExtensionContext) {
  console.log('GitForMe VSCode extension activated!');
  
  const provider = new GitformeSidebarProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('gitforme-sidebar', provider)
  );

  // Command to analyze current repository
  const analyzeCurrentRepo = vscode.commands.registerCommand('gitforme.analyzeCurrentRepo', async () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder found');
      return;
    }

    try {
      const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
      const git = gitExtension?.getAPI(1);
      const repo = git?.repositories[0];
      
      if (repo && repo.state.remotes.length > 0) {
        const remoteUrl = repo.state.remotes[0].fetchUrl;
        if (remoteUrl) {
          provider.analyzeRepository(remoteUrl);
        } else {
          vscode.window.showErrorMessage('No remote URL found for current repository');
        }
      } else {
        vscode.window.showErrorMessage('No Git repository found in workspace');
      }
    } catch (error) {
      vscode.window.showErrorMessage('Error accessing Git information');
    }
  });

  // Command to login with GitHub
  const loginCommand = vscode.commands.registerCommand('gitforme.login', async () => {
    const success = await loginWithGitHub();
    if (success) {
      provider.refreshAuthStatus();
    }
  });

  // Command to logout
  const logoutCommand = vscode.commands.registerCommand('gitforme.logout', async () => {
    await logout();
    provider.refreshAuthStatus();
  });

  context.subscriptions.push(analyzeCurrentRepo, loginCommand, logoutCommand);
}

export function deactivate() {}

class GitformeSidebarProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private currentUser: AuthUser | null = null;
  private isInitialized = false;

  constructor(private readonly _extensionUri: vscode.Uri) {
    // Don't initialize auth in constructor, do it when webview is ready
  }

  async resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;
    
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    // Initialize with basic HTML first
    this.setBasicContent();

    // Then initialize auth and update content
    try {
      await this.initializeAuth();
      this.updateWebviewContent();
    } catch (error) {
      console.error('Error initializing auth:', error);
      this.setErrorContent('Failed to initialize authentication');
    }

    // Handle messages from webview
    webviewView.webview.onDidReceiveMessage(async (message) => {
      try {
        switch (message.type) {
          case 'analyzeRepo':
            await this.analyzeRepository(message.repoUrl);
            break;
          case 'openInBrowser':
            vscode.env.openExternal(vscode.Uri.parse(message.url));
            break;
          case 'login':
            const success = await loginWithGitHub();
            if (success) {
              await this.refreshAuthStatus();
            }
            break;
          case 'logout':
            await logout();
            await this.refreshAuthStatus();
            break;
          case 'checkAuth':
            await this.refreshAuthStatus();
            break;
        }
      } catch (error) {
        console.error('Error handling message:', error);
        this._view?.webview.postMessage({
          type: 'showError',
          message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    });
  }

  private setBasicContent() {
    if (!this._view) return;
    
    this._view.webview.html = this.getBasicHtml();
  }

  private setErrorContent(message: string) {
    if (!this._view) return;
    
    this._view.webview.html = this.getErrorHtml(message);
  }

  async initializeAuth() {
    try {
      this.currentUser = await getCurrentUser();
      this.isInitialized = true;
    } catch (error) {
      console.error('Auth initialization failed:', error);
      this.currentUser = null;
      this.isInitialized = true;
    }
  }

  async refreshAuthStatus() {
    try {
      this.currentUser = await getCurrentUser();
      this.updateWebviewContent();
      
      if (this._view) {
        this._view.webview.postMessage({
          type: 'authStatusChanged',
          user: this.currentUser,
          isAuthenticated: !!this.currentUser
        });
      }
    } catch (error) {
      console.error('Error refreshing auth status:', error);
    }
  }

  updateWebviewContent() {
    if (this._view && this.isInitialized) {
      this._view.webview.html = this.getHtmlForWebview();
    }
  }

  async analyzeRepository(repoUrl: string) {
    if (!this._view) {
      return;
    }

    try {
      // Check if user is authenticated
      if (!this.currentUser) {
        this._view.webview.postMessage({
          type: 'showAuthRequired',
          message: 'Please log in with GitHub to analyze repositories'
        });
        return;
      }

      this._view.webview.postMessage({
        type: 'showLoading',
        message: 'Analyzing repository...'
      });

      const { username, reponame } = parseGitHubUrl(repoUrl);
      if (!username || !reponame) {
        throw new Error('Invalid GitHub URL');
      }

      // Fetch basic repo data
      const repoData = await fetchRepoData(username, reponame);
      
      this._view.webview.postMessage({
        type: 'showRepoData',
        data: {
          repoData,
          username,
          reponame,
          repoUrl
        }
      });

    } catch (error) {
      if (error instanceof Error && error.message.includes('Authentication')) {
        this._view.webview.postMessage({
          type: 'showAuthRequired',
          message: error.message
        });
      } else {
        this._view.webview.postMessage({
          type: 'showError',
          message: error instanceof Error ? error.message : 'Unknown error occurred'
        });
      }
    }
  }

  private getBasicHtml(): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>GitForMe</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            padding: 2rem;
            text-align: center;
          }
          .loading {
            color: var(--vscode-descriptionForeground);
          }
        </style>
      </head>
      <body>
        <div class="loading">
          <div style="font-size: 2rem; margin-bottom: 1rem;">⏳</div>
          <div>Loading GitForMe...</div>
        </div>
      </body>
      </html>
    `;
  }

  private getErrorHtml(message: string): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>GitForMe - Error</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            padding: 2rem;
            text-align: center;
          }
          .error {
            background: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            color: var(--vscode-errorForeground);
            padding: 1rem;
            border-radius: 6px;
            margin: 1rem 0;
          }
          .btn {
            padding: 0.75rem 1.5rem;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.9rem;
            margin-top: 1rem;
          }
          .btn:hover {
            background: var(--vscode-button-hoverBackground);
          }
        </style>
      </head>
      <body>
        <div style="font-size: 1.5rem; margin-bottom: 1rem;">🔍 GitForMe</div>
        <div class="error">
          <strong>Error:</strong> ${message}
        </div>
        <button class="btn" onclick="window.location.reload()">Retry</button>
      </body>
      </html>
    `;
  }

  private getHtmlForWebview(): string {
    const isAuthenticated = !!this.currentUser;
    const userInfo = this.currentUser;

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>GitForMe</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            padding: 1rem;
            line-height: 1.6;
          }
          
          .container {
            max-width: 100%;
          }
          
          .header {
            text-align: center;
            margin-bottom: 2rem;
          }
          
          .logo {
            font-size: 1.5rem;
            font-weight: bold;
            color: var(--vscode-textLink-foreground);
            margin-bottom: 0.5rem;
          }
          
          .auth-section {
            background: var(--vscode-panel-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 1.5rem;
            margin-bottom: 2rem;
            text-align: center;
          }
          
          .auth-status {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 1rem;
          }
          
          .user-info {
            display: flex;
            align-items: center;
            gap: 0.75rem;
          }
          
          .user-avatar {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            border: 2px solid var(--vscode-textLink-foreground);
          }
          
          .user-name {
            font-weight: 600;
            color: var(--vscode-textLink-foreground);
          }
          
          .search-container {
            margin-bottom: 2rem;
          }
          
          .search-box {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid var(--vscode-input-border);
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border-radius: 6px;
            font-size: 0.9rem;
            margin-bottom: 0.75rem;
          }
          
          .search-box:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
          }
          
          .btn {
            width: 100%;
            padding: 0.75rem;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.9rem;
            font-weight: 600;
            transition: background 0.2s;
            margin-bottom: 0.5rem;
          }
          
          .btn:hover {
            background: var(--vscode-button-hoverBackground);
          }
          
          .btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
          
          .btn-secondary {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
          }
          
          .btn-secondary:hover {
            background: var(--vscode-button-secondaryHoverBackground);
          }
          
          .result-container {
            margin-top: 1.5rem;
          }
          
          .loading {
            text-align: center;
            padding: 2rem;
            color: var(--vscode-descriptionForeground);
          }
          
          .error {
            background: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            color: var(--vscode-errorForeground);
            padding: 1rem;
            border-radius: 6px;
            margin-top: 1rem;
          }
          
          .auth-required {
            background: var(--vscode-inputValidation-warningBackground);
            border: 1px solid var(--vscode-inputValidation-warningBorder);
            color: var(--vscode-inputValidation-warningForeground);
            padding: 1rem;
            border-radius: 6px;
            margin-top: 1rem;
            text-align: center;
          }
          
          .repo-card {
            background: var(--vscode-panel-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 1.5rem;
            margin-bottom: 1rem;
          }
          
          .repo-header {
            margin-bottom: 1rem;
          }
          
          .repo-title {
            font-size: 1.2rem;
            font-weight: bold;
            color: var(--vscode-textLink-foreground);
            margin-bottom: 0.5rem;
          }
          
          .repo-description {
            color: var(--vscode-descriptionForeground);
            margin-bottom: 1rem;
          }
          
          .repo-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
            gap: 1rem;
            margin-bottom: 1rem;
          }
          
          .stat-item {
            text-align: center;
            padding: 0.5rem;
            background: var(--vscode-editor-background);
            border-radius: 6px;
          }
          
          .stat-value {
            font-size: 1.1rem;
            font-weight: bold;
            color: var(--vscode-textLink-foreground);
          }
          
          .stat-label {
            font-size: 0.8rem;
            color: var(--vscode-descriptionForeground);
          }
          
          .actions {
            display: flex;
            gap: 0.5rem;
            flex-wrap: wrap;
          }
          
          .action-btn {
            flex: 1;
            padding: 0.5rem;
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.8rem;
            min-width: 80px;
          }
          
          .action-btn:hover {
            background: var(--vscode-button-secondaryHoverBackground);
          }
          
          .insights-section {
            margin-top: 1.5rem;
          }
          
          .insights-title {
            font-size: 1rem;
            font-weight: bold;
            margin-bottom: 1rem;
            color: var(--vscode-textLink-foreground);
          }
          
          .insight-card {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-widget-border);
            border-radius: 6px;
            padding: 1rem;
            margin-bottom: 0.75rem;
          }
          
          .insight-title {
            font-weight: 600;
            margin-bottom: 0.5rem;
          }
          
          .insight-content {
            font-size: 0.9rem;
            color: var(--vscode-descriptionForeground);
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🔍 GitForMe</div>
            <p style="font-size: 0.9rem; color: var(--vscode-descriptionForeground);">
              Analyze GitHub repositories with powerful insights
            </p>
          </div>
          
          <div class="auth-section">
            ${isAuthenticated ? `
              <div class="auth-status">
                <div class="user-info">
                  <img src="${userInfo?.avatar_url || ''}" alt="Avatar" class="user-avatar" />
                  <div>
                    <div class="user-name">${userInfo?.username || 'User'}</div>
                    <div style="font-size: 0.8rem; color: var(--vscode-descriptionForeground);">Authenticated</div>
                  </div>
                </div>
                <button class="btn-secondary" onclick="logout()">Logout</button>
              </div>
            ` : `
              <div style="margin-bottom: 1rem;">
                <h3 style="margin-bottom: 0.5rem; color: var(--vscode-textLink-foreground);">Authentication Required</h3>
                <p style="font-size: 0.9rem; color: var(--vscode-descriptionForeground); margin-bottom: 1rem;">
                  Sign in with GitHub to analyze repositories and access insights
                </p>
                <button class="btn" onclick="login()">
                  <span style="margin-right: 0.5rem;">🔗</span>
                  Login with GitHub
                </button>
              </div>
            `}
          </div>
          
          ${isAuthenticated ? `
            <div class="search-container">
              <input 
                type="text" 
                id="repoUrl" 
                class="search-box"
                placeholder="Enter GitHub repository URL (e.g., https://github.com/owner/repo)"
                value="https://github.com/herin7/gitforme"
              />
              <button id="analyzeBtn" class="btn">Analyze Repository</button>
            </div>
          ` : ''}
          
          <div id="result" class="result-container"></div>
        </div>

        <script>
          const vscode = acquireVsCodeApi();
          
          // Check authentication status on load
          vscode.postMessage({ type: 'checkAuth' });
          
          ${isAuthenticated ? `
            document.getElementById('analyzeBtn')?.addEventListener('click', function() {
              const repoUrl = document.getElementById('repoUrl').value.trim();
              if (!repoUrl) {
                showError('Please enter a repository URL');
                return;
              }
              
              vscode.postMessage({
                type: 'analyzeRepo',
                repoUrl: repoUrl
              });
            });
            
            // Handle enter key in search box
            document.getElementById('repoUrl')?.addEventListener('keypress', function(e) {
              if (e.key === 'Enter') {
                document.getElementById('analyzeBtn').click();
              }
            });
          ` : ''}
          
          function login() {
            vscode.postMessage({ type: 'login' });
          }
          
          function logout() {
            vscode.postMessage({ type: 'logout' });
          }
          
          // Listen for messages from extension
          window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.type) {
              case 'showLoading':
                showLoading(message.message);
                break;
              case 'showRepoData':
                showRepoData(message.data);
                break;
              case 'showError':
                showError(message.message);
                break;
              case 'showAuthRequired':
                showAuthRequired(message.message);
                break;
              case 'authStatusChanged':
                // Reload the webview content when auth status changes
                setTimeout(() => {
                  window.location.reload();
                }, 500);
                break;
            }
          });
          
          function showLoading(message) {
            const resultDiv = document.getElementById('result');
            if (resultDiv) {
              resultDiv.innerHTML = \`
                <div class="loading">
                  <div style="font-size: 2rem; margin-bottom: 1rem;">⏳</div>
                  <div>\${message}</div>
                </div>
              \`;
            }
          }
          
          function showError(message) {
            const resultDiv = document.getElementById('result');
            if (resultDiv) {
              resultDiv.innerHTML = \`
                <div class="error">
                  <strong>Error:</strong> \${message}
                </div>
              \`;
            }
          }
          
          function showAuthRequired(message) {
            const resultDiv = document.getElementById('result');
            if (resultDiv) {
              resultDiv.innerHTML = \`
                <div class="auth-required">
                  <div style="font-size: 1.5rem; margin-bottom: 1rem;">🔒</div>
                  <div style="margin-bottom: 1rem;">\${message}</div>
                  <button class="btn" onclick="login()">Login with GitHub</button>
                </div>
              \`;
            }
          }
          
          function showRepoData(data) {
            const { repoData, username, reponame, repoUrl } = data;
            const resultDiv = document.getElementById('result');
            
            if (resultDiv) {
              resultDiv.innerHTML = \`
                <div class="repo-card">
                  <div class="repo-header">
                    <div class="repo-title">\${repoData.name}</div>
                    <div class="repo-description">\${repoData.description || 'No description available'}</div>
                  </div>
                  
                  <div class="repo-stats">
                    <div class="stat-item">
                      <div class="stat-value">\${formatNumber(repoData.stargazers_count)}</div>
                      <div class="stat-label">Stars</div>
                    </div>
                    <div class="stat-item">
                      <div class="stat-value">\${formatNumber(repoData.forks_count)}</div>
                      <div class="stat-label">Forks</div>
                    </div>
                    <div class="stat-item">
                      <div class="stat-value">\${formatNumber(repoData.open_issues_count)}</div>
                      <div class="stat-label">Issues</div>
                    </div>
                    <div class="stat-item">
                      <div class="stat-value">\${repoData.language || 'N/A'}</div>
                      <div class="stat-label">Language</div>
                    </div>
                  </div>
                  
                  <div class="actions">
                    <button class="action-btn" onclick="openInBrowser('\${repoUrl}')">
                      View on GitHub
                    </button>
                    <button class="action-btn" onclick="fetchInsights('\${username}', '\${reponame}')">
                      Get Insights
                    </button>
                    <button class="action-btn" onclick="fetchIssues('\${username}', '\${reponame}')">
                      View Issues
                    </button>
                  </div>
                </div>
                
                <div class="insights-section">
                  <div class="insights-title">Repository Analysis</div>
                  <div id="insights-container">
                    <div class="insight-card">
                      <div class="insight-title">Repository Health</div>
                      <div class="insight-content">
                        Created: \${new Date(repoData.created_at).toLocaleDateString()}<br>
                        Last updated: \${new Date(repoData.updated_at).toLocaleDateString()}<br>
                        Default branch: \${repoData.default_branch}
                      </div>
                    </div>
                  </div>
                </div>
              \`;
            }
          }
          
          function formatNumber(num) {
            if (num >= 1000000) {
              return (num / 1000000).toFixed(1) + 'M';
            }
            if (num >= 1000) {
              return (num / 1000).toFixed(1) + 'K';
            }
            return num.toString();
          }
          
          function openInBrowser(url) {
            vscode.postMessage({
              type: 'openInBrowser',
              url: url
            });
          }
          
          function fetchInsights(username, reponame) {
            showLoading('Fetching detailed insights...');
            vscode.postMessage({
              type: 'analyzeRepo',
              repoUrl: \`https://github.com/\${username}/\${reponame}\`
            });
          }
          
          function fetchIssues(username, reponame) {
            openInBrowser(\`https://github.com/\${username}/\${reponame}/issues\`);
          }
        </script>
      </body>
      </html>
    `;
  }
}

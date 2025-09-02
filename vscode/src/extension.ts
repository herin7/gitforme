import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  console.log('GitForMe VSCode extension activated!');
  const provider = new GitformeSidebarProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('gitforme-sidebar', provider)
  );
}

export function deactivate() {}

class GitformeSidebarProvider implements vscode.WebviewViewProvider {
  constructor(private readonly _extensionUri: vscode.Uri) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };
    webviewView.webview.html = this.getHtmlForWebview();
  }

  getHtmlForWebview(): string {
    return `
      <div style="font-family: sans-serif; padding: 1rem;">
        <h2>GitForMe Insights</h2>
        <p>Welcome to the GitForMe VSCode extension sidebar!</p>
        <p>Paste a GitHub repo URL and click Fetch (feature coming soon).</p>
      </div>
    `;
  }
}

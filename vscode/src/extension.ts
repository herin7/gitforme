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
    const sidebarScriptUri = vscode.Uri.joinPath(this._extensionUri, 'media', 'sidebar.js');
    const resolvedSidebarScriptUri = webviewView.webview.asWebviewUri(sidebarScriptUri);
    webviewView.webview.html = this.getHtmlForWebview(resolvedSidebarScriptUri);

    // Listen for messages from the webview
    webviewView.webview.onDidReceiveMessage(async (message) => {
      if (message.command === 'fetchInsights') {
        const repoUrl = message.repoUrl;
        // Dynamically import to avoid circular dependency
        const { fetchRepoInsights } = await import('./api');
        const result = await fetchRepoInsights(repoUrl);
        webviewView.webview.postMessage({ command: 'showResult', result });
      }
    });
  }

  getHtmlForWebview(resolvedSidebarScriptUri: vscode.Uri): string {
    const mermaidScriptUri = 'https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js';
    return [
      `<div style="font-family: sans-serif; padding: 1rem;">`,
      `<h2>GitForMe Insights</h2>`,
      `<p>Welcome to the GitForMe VSCode extension sidebar!</p>`,
      `<input id="repoUrl" type="text" placeholder="Paste GitHub repo URL here" style="width: 80%; padding: 0.5em; margin-bottom: 0.5em;" />`,
      `<button id="fetchBtn" style="padding: 0.5em 1em;">Fetch</button>`,
      `<div id="result" style="margin-top: 1em;"></div>`,
      `<div id="mermaid" style="margin-top: 2em;"></div>`,
      `<script src="${mermaidScriptUri}"></script>`,
      `<script src="${resolvedSidebarScriptUri}"></script>`,
      `</div>`
    ].join('\n');
  }
}

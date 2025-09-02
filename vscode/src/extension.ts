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

  getHtmlForWebview(): string {
    return `
      <div style="font-family: sans-serif; padding: 1rem;">
        <h2>GitForMe Insights</h2>
        <p>Welcome to the GitForMe VSCode extension sidebar!</p>
        <input id="repoUrl" type="text" placeholder="Paste GitHub repo URL here" style="width: 80%; padding: 0.5em; margin-bottom: 0.5em;" />
        <button id="fetchBtn" style="padding: 0.5em 1em;">Fetch</button>
        <div id="result" style="margin-top: 1em;"></div>
        <script>
          const vscode = acquireVsCodeApi();
          document.getElementById('fetchBtn').addEventListener('click', function() {
            var repoUrl = document.getElementById('repoUrl').value;
            document.getElementById('result').innerText = 'Fetching insights for: ' + repoUrl;
            vscode.postMessage({ command: 'fetchInsights', repoUrl });
          });
          window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'showResult') {
              document.getElementById('result').innerText = message.result;
            }
          });
        </script>
      </div>
    `;
  }
}

import * as vscode from 'vscode';
import { fetchRepoInsights } from './api';

export function activate(context: vscode.ExtensionContext) {
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
    webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

    // Listen for messages from the webview
    webviewView.webview.onDidReceiveMessage(async (message) => {
      if (message.command === 'fetchInsights') {
        const result = await fetchRepoInsights(message.repoUrl);
        webviewView.webview.postMessage({ command: 'showInsights', result });
      }
    });
  }

  getHtmlForWebview(webview: vscode.Webview): string {
    // Basic UI: repo input and placeholder for insights
    return `
      <div style="font-family: sans-serif; padding: 1rem;">
        <h2>GitForMe Insights</h2>
        <input id="repoUrl" type="text" placeholder="Paste GitHub repo URL..." style="width: 100%; margin-bottom: 1rem;" />
        <button id="fetchBtn">Fetch Insights</button>
        <div id="insights" style="margin-top: 1rem;"></div>
        <script>
          const vscode = acquireVsCodeApi();
          document.getElementById('fetchBtn').onclick = () => {
            const repoUrl = document.getElementById('repoUrl').value;
            document.getElementById('insights').innerText = 'Fetching...';
            vscode.postMessage({ command: 'fetchInsights', repoUrl });
          };
          window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'showInsights') {
              document.getElementById('insights').innerText = message.result;
            }
          });
        </script>
      </div>
    `;
  }
}

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
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
function activate(context) {
    console.log('GitForMe VSCode extension activated!');
    const provider = new GitformeSidebarProvider(context.extensionUri);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider('gitforme-sidebar', provider));
}
function deactivate() { }
class GitformeSidebarProvider {
    constructor(_extensionUri) {
        this._extensionUri = _extensionUri;
    }
    resolveWebviewView(webviewView, context, _token) {
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
                const { fetchRepoInsights } = await Promise.resolve().then(() => __importStar(require('./api')));
                const result = await fetchRepoInsights(repoUrl);
                webviewView.webview.postMessage({ command: 'showResult', result });
            }
        });
    }
    getHtmlForWebview(resolvedSidebarScriptUri) {
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

const vscode = acquireVsCodeApi();
mermaid.initialize({ startOnLoad: false });
document.getElementById('fetchBtn').addEventListener('click', function() {
  var repoUrl = document.getElementById('repoUrl').value;
  document.getElementById('result').innerText = 'Fetching insights for: ' + repoUrl;
  document.getElementById('mermaid').innerHTML = '';
  vscode.postMessage({ command: 'fetchInsights', repoUrl });
});
window.addEventListener('message', event => {
  const message = event.data;
  if (message.command === 'showResult') {
    if (message.result.startsWith('flowchart')) {
      document.getElementById('result').innerText = '';
      document.getElementById('mermaid').innerHTML = `<pre class='mermaid'>${message.result}</pre>`;
      mermaid.init(undefined, document.querySelectorAll('.mermaid'));
    } else {
      document.getElementById('result').innerText = message.result;
      document.getElementById('mermaid').innerHTML = '';
    }
  }
});

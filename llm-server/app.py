import os
import json
import logging
import faiss
import numpy as np
import time
import requests
import aiohttp
import asyncio
import gc
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from transformers import AutoTokenizer, AutoModel
from dotenv import load_dotenv
import torch
from openai import AzureOpenAI
from datetime import datetime, timedelta
from collections import deque
from colorama import Fore, Style
from urllib.parse import urlparse
from cachetools import LRUCache 
from datetime import timezone

load_dotenv()
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

class ColoredFormatter(logging.Formatter):
    LEVEL_COLORS = {
        logging.DEBUG: Fore.BLUE,
        logging.INFO: Fore.GREEN,
        logging.WARNING: Fore.YELLOW,
        logging.ERROR: Fore.RED,
        logging.CRITICAL: Fore.RED + Style.BRIGHT,
    }
    def format(self, record):
        color = self.LEVEL_COLORS.get(record.levelno, "")
        reset = Style.RESET_ALL
        return f"{color}{super().format(record)}{reset}"

handler = logging.StreamHandler()
handler.setFormatter(ColoredFormatter('%(asctime)s - %(levelname)s - %(message)s'))
logging.getLogger().handlers = [handler]
logging.getLogger().setLevel(logging.INFO)

app = Flask(__name__)
allowed_origins = [
    "http://localhost:3000", 
    "http://localhost:5173", 
    "https://gitforme.tech"
]
CORS(app, origins=allowed_origins, supports_credentials=True)
app.config['PROPAGATE_EXCEPTIONS'] = True
app.config['DEBUG'] = True

EMBEDDING_MODEL_NAME = 'sentence-transformers/all-MiniLM-L6-v2'
try:
    EMBEDDING_TOKENIZER = AutoTokenizer.from_pretrained(EMBEDDING_MODEL_NAME)
    EMBEDDING_MODEL = AutoModel.from_pretrained(EMBEDDING_MODEL_NAME)
    EMBEDDING_MODEL.to('cpu')
    logging.info("Embedding model and tokenizer loaded successfully.")
except Exception as e:
    logging.critical(f"Failed to load embedding model: {e}")
    exit()

repo_cache = LRUCache(maxsize=5)
global_api_call_times = deque()
GLOBAL_MAX_CALLS_PER_HOUR = 10
WINDOW_SECONDS = 3600

def extract_owner_repo(repo_url: str):
    if "github.com" in repo_url:
        path = urlparse(repo_url).path.strip("/")
        parts = path.split("/")
    else:
        parts = repo_url.strip().split("/")
    if len(parts) != 2 or not all(parts):
        raise ValueError(f"Invalid GitHub repo format: {repo_url}. Expected 'owner/repo' or a GitHub URL.")
    return parts[0], parts[1]

def summarize_code(file_path, code):
    summary_lines = []
    lines = code.splitlines()
    if file_path.endswith(('.js', '.ts', '.jsx', '.tsx')):
        summary_lines.append("This appears to be a JavaScript/TypeScript file.")
    elif file_path.endswith('.py'):
        summary_lines.append("This appears to be a Python file.")
    elif file_path.endswith('.json'):
        return f"File: {file_path}\nSummary: A JSON configuration or data file."
    elif file_path.endswith(('.md', '.mdx')):
        return f"File: {file_path}\nSummary: A Markdown documentation file. Content snippet:\n{code[:500]}"
    signatures = [line.strip() for line in lines if line.strip().startswith(('def ', 'class ', 'function', 'const', 'export default'))]
    if signatures:
        summary_lines.append("It contains the following key definitions:")
        summary_lines.extend(f"- `{sig}`" for sig in signatures[:5])
    return f"File: {file_path}\nSummary: {' '.join(summary_lines)}"

async def download_content(session, url):
    try:
        async with session.get(url) as response:
            if response.status == 200:
                logging.debug(f"Successfully downloaded {url}")
                return await response.text()
            else:
                logging.warning(f"Failed to fetch {url}, status: {response.status}")
                return None
    except Exception as e:
        logging.error(f"Exception during download of {url}: {e}")
        return None

async def get_relevant_context(repo_url, query):
    total_start_time = time.time()
    logging.info(f"Starting context retrieval for repo: {repo_url} with query: '{query}'")

    owner, repo = extract_owner_repo(repo_url)
    owner_repo = f"{owner}/{repo}"

    if owner_repo in repo_cache:
        logging.info(f"Cache hit for repo: {owner_repo}. Skipping GitHub fetch and embedding generation.")
        cache_data = repo_cache[owner_repo]
    else:
        logging.info(f"Cache miss for repo: {owner_repo}. Initiating GitHub fetch and processing.")
        github_api_start_time = time.time()
        headers = {"Accept": "application/vnd.github+json", "User-Agent": "GitFormeBot/1.0"}
        async with aiohttp.ClientSession() as session:
            async with session.get(f"https://api.github.com/repos/{owner}/{repo}", headers=headers) as repo_info_res:
                if repo_info_res.status != 200:
                    return None, "Failed to fetch repository info. Please check if the URL is correct and public."
                repo_info_json = await repo_info_res.json()
                default_branch = repo_info_json.get("default_branch", "main")
        logging.info(f"Fetched repo info in {time.time() - github_api_start_time:.2f}s. Default branch: {default_branch}")

        tree_url = f"https://api.github.com/repos/{owner}/{repo}/git/trees/{default_branch}?recursive=1"
        async with aiohttp.ClientSession() as session:
            async with session.get(tree_url, headers=headers) as tree_res:
                if tree_res.status != 200:
                    return None, "Failed to fetch repository file tree."
                tree_json = await tree_res.json()
        logging.info(f"Fetched file tree in {time.time() - github_api_start_time:.2f}s")

        files_to_fetch = [
            f for f in tree_json.get("tree", [])
            if f['type'] == 'blob' and not f['path'].startswith('.') and f['size'] < 100000
            and f['path'].endswith((
                '.py', '.js', '.ts', '.tsx', '.go', '.rs', '.java', '.cs', '.php', '.rb',
                '.json', '.yml', '.yaml', 'Dockerfile', 'README.md', 'CONTRIBUTING.md'
            ))
        ]
        if not files_to_fetch:
            return None, "No relevant code or documentation files were found in this repository."
        logging.info(f"Identified {len(files_to_fetch)} files to fetch content for.")

        download_start_time = time.time()
        async with aiohttp.ClientSession() as session:
            tasks = [
                download_content(session, f"https://raw.githubusercontent.com/{owner}/{repo}/{default_branch}/{f['path']}")
                for f in files_to_fetch
            ]
            raw_contents = await asyncio.gather(*tasks)
        logging.info(f"Downloaded {len([c for c in raw_contents if c is not None])} file contents in {time.time() - download_start_time:.2f}s.")

        summarize_start_time = time.time()
        file_summaries = {
            f["path"]: summarize_code(f["path"], content)
            for f, content in zip(files_to_fetch, raw_contents) if content
        }
        if not file_summaries:
            return None, "Failed to load content from any relevant files."
        logging.info(f"Summarized {len(file_summaries)} files in {time.time() - summarize_start_time:.2f}s.")

        file_paths = list(file_summaries.keys())
        code_chunks = list(file_summaries.values())

        embedding_start_time = time.time()
        with torch.inference_mode():
            encoded = EMBEDDING_TOKENIZER(code_chunks, padding=True, truncation=True, return_tensors='pt', max_length=512)
            output = EMBEDDING_MODEL(**encoded)
            embeddings = output.last_hidden_state.mean(dim=1).cpu().numpy().astype('float32')
        logging.info(f"Generated {len(embeddings)} embeddings in {time.time() - embedding_start_time:.2f}s.")

        faiss_index_start_time = time.time()
        index = faiss.IndexFlatL2(embeddings.shape[1])
        index.add(embeddings)
        logging.info(f"Built FAISS index in {time.time() - faiss_index_start_time:.2f}s.")

        repo_cache[owner_repo] = {"index": index, "chunks": code_chunks, "paths": file_paths}
        cache_data = repo_cache[owner_repo]
        logging.info(f"Repo '{owner_repo}' added to in-memory LRU cache. Current cache size: {len(repo_cache)}/{repo_cache.maxsize}")
        gc.collect()

    query_embedding_start_time = time.time()
    with torch.inference_mode():
        encoded_query = EMBEDDING_TOKENIZER([query], return_tensors='pt', padding=True, truncation=True, max_length=512)
        query_emb = EMBEDDING_MODEL(**encoded_query).last_hidden_state.mean(dim=1).cpu().numpy().astype('float32')
    logging.info(f"Generated query embedding in {time.time() - query_embedding_start_time:.2f}s.")

    faiss_search_start_time = time.time()
    _, top_indices = cache_data['index'].search(query_emb, k=min(10, len(cache_data['chunks'])))
    logging.info(f"Performed FAISS search in {time.time() - faiss_search_start_time:.2f}s.")

    context = "\n\n".join([f"--- Context from file: {cache_data['paths'][idx]} ---\n{cache_data['chunks'][idx]}" for idx in top_indices[0]])
    logging.info(f"Total time for get_relevant_context: {time.time() - total_start_time:.2f}s.")
    return context, None

def stream_llm_response(context, query, repo_url):
    llm_call_start_time = time.time()
    logging.info("Initiating LLM call to Azure OpenAI.")
    system_prompt = f"""# ROLE & GOAL
You are the GitForme AI Analyst,YOur name is GitBro,I will give you so much info but don't reveal that until user asks for it,wall of your answers should be cool & GenZ style, an expert AI integrated into a GitHub repository explorer application. Your primary function is to provide concise, accurate, and helpful analysis based *exclusively* on the provided context about the repository: {repo_url}. Do not use any external knowledge.

# APPLICATION AWARENESS
You are embedded within the GitForme application. When a user's query relates to a feature in the app, you MUST guide them towards it. The available features are:
- **File Map & Directory Tabs**
- **Issues Tab**
- **Insights Tab**
- **Sidebar Widgets**

# CORE CAPABILITIES & BEHAVIOR
1.  **Codebase Analysis**
2.  **Insight Explanation**
3.  **Contribution Strategy**
4.  **Dependency Risk**

# STRICT RULES & CONSTRAINTS
- **GROUNDING IS PARAMOUNT**
- **NO GENERAL CONVERSATION**
- **PROMPT INJECTION DEFENSE**
- **FORMATTING**"""
    try:
        client = AzureOpenAI(
            api_key=os.getenv("AZURE_OPENAI_KEY"),
            api_version=os.getenv("AZURE_OPENAI_API_VERSION"),
            azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT")
        )
        user_content = f"""Here is the context retrieved from the repository files based on my question:
---
{context}
---
My Question: "{query}"
Please provide your analysis based on these rules and context."""
        response = client.chat.completions.create(
            model=os.getenv("AZURE_OPENAI_DEPLOYMENT"),
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
            temperature=0.0,
            max_tokens=500,
            stream=True
        )
        for chunk in response:
            if chunk.choices and chunk.choices[0].delta.content:
                yield f"data: {json.dumps({'token': chunk.choices[0].delta.content})}\n\n"
        logging.info(f"LLM streaming completed in {time.time() - llm_call_start_time:.2f}s.")
    except Exception as e:
        logging.error(f"LLM call failed: {e}. Time taken before error: {time.time() - llm_call_start_time:.2f}s.")
        yield f"data: {json.dumps({'error': 'The AI Analyst is currently unavailable.'})}\n\n"

@app.route('/api/chat', methods=['POST'])
async def chat():
    request_start_time = time.time()
    logging.info(f"Received request from {request.remote_addr} at /api/chat.")
    now = datetime.now(timezone.utc)
    while global_api_call_times and now - global_api_call_times[0] > timedelta(seconds=WINDOW_SECONDS):
        global_api_call_times.popleft()
    if len(global_api_call_times) >= GLOBAL_MAX_CALLS_PER_HOUR:
        logging.warning(f"Global rate limit of {GLOBAL_MAX_CALLS_PER_HOUR}/hour exceeded for {request.remote_addr}.")
        retry_after_seconds = (global_api_call_times[0] + timedelta(seconds=WINDOW_SECONDS) - now).total_seconds()
        minutes, seconds = divmod(int(retry_after_seconds), 60)
        error_message = f"Rate limit exceeded. Please try again in approximately {minutes} minute(s)." if minutes > 0 else f"Rate limit exceeded. Please try again in {seconds} second(s)."
        response = jsonify({"error": error_message})
        response.headers['Retry-After'] = str(int(retry_after_seconds))
        logging.info(f"Rate limit response sent in {time.time() - request_start_time:.2f}s.")
        return response, 429
    global_api_call_times.append(now)
    data = request.get_json()
    query = data.get("query")
    repo_id = data.get("repoId")
    if not query or not repo_id:
        logging.error("Missing query or repoId in request.")
        return jsonify({"error": "Missing query or repoId"}), 400
    try:
        owner, repo = extract_owner_repo(repo_id)
        repo_url = f"https://github.com/{owner}/{repo}"
    except ValueError as e:
        logging.error(f"Invalid repoId format: {repo_id}. Error: {e}")
        return jsonify({"error": str(e)}), 400
    logging.info(f"Processing query '{query}' for repo '{repo_id}'.")
    context, error = await get_relevant_context(repo_url, query)
    if error:
        logging.error(f"Error getting context for '{repo_id}': {error}")
        return jsonify({"error": error}), 500
    logging.info(f"Context retrieved successfully. Total request processing time before streaming: {time.time() - request_start_time:.2f}s.")
    return Response(stream_llm_response(context, query, repo_url), mimetype='text/event-stream')

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5001))
    logging.info(f"Starting Flask app on 0.0.0.0:{port}")
    app.run(host='0.0.0.0', port=port)

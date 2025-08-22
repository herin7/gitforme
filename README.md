<div align="center">
  <img src="https://raw.githubusercontent.com/herin7/gitforme/main/gitforme/logo.png" alt="GitForMe Logo" width="150"/>
  <h1>GitForMe</h1>
  <p><strong>Understand any GitHub repository in minutes, not days.</strong></p>
  <p>Your AI-powered co-pilot for navigating, understanding, and contributing to open-source projects.</p>
  <br/>
  <p>
    <a href="https://www.gitforme.tech" target="_blank"><img src="https://img.shields.io/badge/Live_Demo-gitforme.tech-brightgreen?style=for-the-badge&logo=icloud" alt="Live Demo"></a>
  </p>
  <p>
    <a href="https://github.com/herin7/gitforme/releases"><img src="https://img.shields.io/github/v/release/herin7/gitforme?style=flat-square" alt="GitHub release"></a>
    <a href="https://github.com/herin7/gitforme/issues"><img src="https://img.shields.io/github/issues/herin7/gitforme?style=flat-square" alt="Issues"></a>
    <a href="https://github.com/herin7/gitforme/stargazers"><img src="https://img.shields.io/github/stars/herin7/gitforme?style=flat-square" alt="Stars"></a>
  </p>
</div>

---

Jumping into a new, complex GitHub repository can feel like navigating an ocean without a map. That initial "where do I even start?" moment is a real blocker for developers who want to contribute to open-source.

**GitForMe** is an intelligent code exploration platform that solves this problem. Just paste a repository URL, and GitForMe generates a comprehensive, interactive dashboard that demystifies the codebase, helping you make your first contribution faster than ever.

## ✨ Key Features

* **🤖 AI-Powered Chat (GitBro)**: Ask questions about the codebase in natural language. GitBro uses the repository's context to give you accurate, grounded answers.
* **📊 Interactive Dashboard**: Get a bird's-eye view of any repository with:
    * **Code Hotspots**: Instantly see the most active and complex files.
    * **Dependency Analysis**: Check for outdated packages and potential security risks.
    * **Contribution Insights**: Find "Good First Issues" and understand contributor activity.
* **🧠 Super Context Builder**: Select specific files, folders, or issues to create a focused context, then copy it to your favorite LLM (ChatGPT, Claude, Gemini) for deeper analysis.
* **📂 Smart File Explorer**: Navigate the repository structure with an intuitive file tree.
* **🚀 One-Click Setup**: Clone the repository and open it directly in VS Code with a single click.

## 🛠️ Tech Stack

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-0055FF?style=for-the-badge&logo=framer&logoColor=white)
![FAISS](https://img.shields.io/badge/FAISS-4A90E2?style=for-the-badge&logo=facebook&logoColor=white)
![Azure](https://img.shields.io/badge/Azure-0078D4?style=for-the-badge&logo=microsoftazure&logoColor=white)

## 🏛️ How It Works: Architecture

GitForMe uses a microservice architecture to separate concerns and ensure scalability.


1.  **Frontend**: The user interacts with a responsive web app built with React, Vite, and Framer Motion.
2.  **Backend**: A Node.js/Express server handles user authentication, fetches repository data via the GitHub API, and coordinates with the LLM server.
3.  **LLM Server**: A Python/Flask server manages all AI-powered tasks. It creates vector embeddings of the code (`sentence-transformers`), stores them in a `FAISS` index for fast retrieval, and streams responses from the language model (e.g., Azure OpenAI).
## 📸 Screenshots
<div align="center" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 20px 0;">
  <div>
    <img src="https://github.com/herin7/gitforme/raw/main/sc/ll3.png" alt="File Explorer" style="width: 100%; max-height: 300px; object-fit: contain; border: 1px solid #ddd; border-radius: 8px;"/>
    <p><em>Landing Page</em></p>
  </div>
</div>

## 🎥 Watch How GitForMe Works

* Get a quick walkthrough of the platform in under 5 minutes!

[GitForMe Explainer Video](https://youtu.be/5_eIceKWo7o)

## 🚀 Get It Running Locally

Want to run GitForMe on your own machine? Here’s how.

### Prerequisites
* [Node.js](https://nodejs.org/) (v18+) and npm
* [Python](https://www.python.org/) (v3.8+) and pip
* [Git](https://git-scm.com/)
* An Azure OpenAI API Key (or you can adapt the code for another LLM provider)


### Installation Guide

<details>
<summary>Click to view step-by-step installation instructions</summary>

1.  **Clone the Repository**
    ```sh
    git clone https://github.com/herin7/gitforme.git
    cd gitforme
    ```

2.  **Setup the Backend Server**
    ```sh
    cd server
    npm install
    ```
    Create a `.env` file and add your GitHub OAuth credentials:
    ```env
    GITHUB_CLIENT_ID=your_client_id
    GITHUB_CLIENT_SECRET=your_client_secret
    ```
    Then, start the server:
    ```sh
    npm start
    ```

3.  **Setup the LLM Server**
    ```sh
    cd ../llm-server
    pip install -r requirements.txt
    ```
    Create a `.env` file and add your Azure OpenAI credentials:
    ```env
    AZURE_OPENAI_KEY=your_key
    AZURE_OPENAI_ENDPOINT=your_endpoint
    AZURE_OPENAI_DEPLOYMENT=your_deployment_name
    ```
    Then, start the server:
    ```sh
    flask run
    ```

4.  **Setup the Frontend**
    ```sh
    cd ../gitforme
    npm install
    ```
    Create a `.env.local` file and add the URL of your backend server:
    ```env
    VITE_API_URL=http://localhost:3001
    ```
    Then, start the development server:
    ```sh
    npm run dev
    ```
Your local GitForMe instance should now be running at `http://localhost:5173`!

</details>

## 💖 How to Contribute

We welcome contributions from the open-source community with open arms! If you're looking to help, here’s how you can get started.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

### Good First Issues
Looking for an easy way to start? Check out these areas:
* **Improve UI/UX**: Enhance the styling of components or improve mobile responsiveness.
* **Add More File Parsers**: Extend the `summarize_code` function in `app.py` to support more languages.
* **Enhance Error Handling**: Improve error messages and user feedback across the application.
* **Write Tests**: We always need more unit and integration tests!

## 📄 License

Distributed under the MIT License. See `LICENSE.txt` for more information.

## 📧 Contact

Herin - [@herin7](https://github.com/herin7)

Project Link: [https://github.com/herin7/gitforme](https://github.com/herin7/gitforme)

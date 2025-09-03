# GitForMe VS Code Extension

A powerful VS Code extension that brings the functionality of [GitForMe](https://gitforme.tech) directly into your development environment. Analyze GitHub repositories, get insights, and explore code patterns without leaving VS Code.

## Features

- 🔍 **Repository Analysis**: Analyze any GitHub repository with detailed insights
- 📊 **Statistics**: View stars, forks, issues, and language information
- 🔐 **GitHub Authentication**: Secure login with GitHub OAuth
- 🎯 **Quick Actions**: Direct links to GitHub, issues, and insights
- 🎨 **Native VS Code UI**: Beautiful interface that adapts to your VS Code theme

## Prerequisites

Before using the extension, make sure you have:

1. **GitForMe Server Running**: Start your GitForMe server locally
   ```bash
   cd server
   npm install
   npm start
   ```
   The server should be running on `http://localhost:3000`

2. **GitHub Account**: You'll need a GitHub account to authenticate and access repository data

## Installation & Usage

### 1. Load the Extension in Development Mode

1. Open the `vscode` folder in VS Code:
   ```bash
   cd vscode
   code .
   ```

2. Press `F5` or go to **Run & Debug** panel and click **"Run GitForMe Extension"**

3. A new VS Code window will open with the extension loaded

### 2. Authenticate with GitHub

1. In the new VS Code window, look for the **GitForMe** icon (🔍) in the Activity Bar
2. Click on it to open the GitForMe sidebar
3. Click **"Login with GitHub"** 
4. Your browser will open to GitHub OAuth page
5. After authorization, copy the token from the success page
6. Paste the token back in VS Code when prompted

### 3. Analyze Repositories

Once authenticated:
1. Enter any GitHub repository URL in the search box
2. Click **"Analyze Repository"**
3. View detailed repository information and insights
4. Use quick actions to:
   - View repository on GitHub
   - Get detailed insights
   - View issues

## Available Commands

- **GitForMe: Login with GitHub** - Authenticate with your GitHub account
- **GitForMe: Logout** - Sign out and clear authentication
- **GitForMe: Analyze Current Repository** - Analyze the repository in your current workspace

## Configuration

The extension stores authentication data securely in VS Code's configuration:
- `gitforme.authToken` - Your authentication token
- `gitforme.user` - Your user information

## API Endpoints

The extension connects to your local GitForMe server at `http://localhost:3000` and uses the same API endpoints as the web application:

- Repository data: `/api/github/{username}/{reponame}`
- Authentication: `/api/auth/github`
- Token verification: `/api/auth/verifyToken`

## Development

### Building the Extension

```bash
npm install
npm run compile
```

### Running in Development

```bash
npm run watch  # Watch for changes
```

### Project Structure

```
vscode/
├── src/
│   ├── extension.ts    # Main extension logic
│   └── api.ts         # API communication and authentication
├── media/
│   └── icon.svg       # Extension icon
├── .vscode/
│   ├── launch.json    # Debug configuration
│   └── tasks.json     # Build tasks
└── package.json       # Extension manifest
```

## Troubleshooting

### Authentication Issues
- Make sure your GitForMe server is running on `http://localhost:3000`
- Check that the GitHub OAuth app is configured correctly
- Try logging out and logging back in

### API Errors
- Verify the server is accessible at `http://localhost:3000`
- Check server logs for authentication issues
- Ensure your GitHub token has the necessary permissions

### Extension Not Loading
- Try reloading the extension development window
- Check the VS Code Developer Console for errors
- Ensure all dependencies are installed with `npm install`

## Contributing

This extension is part of the GitForMe project. To contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test the extension thoroughly
5. Submit a pull request

## License

This project is licensed under the same license as the GitForMe project.

---

**Made with ❤️ for the developer community**

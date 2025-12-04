# GitHub Issue Creator Extension

A simple and efficient Google Chrome extension that allows you to create GitHub issues directly from your browser toolbar. Streamline your workflow by reporting bugs and requesting features without leaving your current tab.

## 🚀 Features

*   **Quick Issue Creation:** Instantly open a popup to draft and submit issues.
*   **Smart Labels:** Automatically fetches labels from your repository. Select them with a single click using the beautiful, glassy UI.
*   **Image Attachments:** 
    *   Click the attach image button to upload images.
    *   **Paste support:** Simply paste (Ctrl+V) images directly into the body text area.
    *   Images are automatically uploaded to your repo and embedded as Markdown.
*   **Dark Mode:** Fully themed dark mode for late-night coding sessions. 🌙
*   **Auto-Save Settings:** Remembers your Token, Owner, and Repo so you're always ready to go.
*   **Assignees:** Easily assign team members to issues.
*   **Secure:** Your Personal Access Token is stored locally in your browser's sync storage and communicates directly with the GitHub API. No intermediate servers.

## 📥 Installation

**[Download from the Chrome Web Store](YOUR_WEBSTORE_LINK_HERE)**

1.  Click the link above to visit the Chrome Web Store.
2.  Click **Add to Chrome**.
3.  Pin the extension to your toolbar for easy access!

## ⚙️ Configuration

To use the extension, you need a GitHub Personal Access Token (PAT).

1.  **Generate a Token:**
    *   Go to [GitHub Settings > Developer settings > Personal access tokens > Tokens (classic)](https://github.com/settings/tokens).
    *   Click **Generate new token** -> **Generate new token (classic)**.
    *   **Note:** Give it a name like "Issue Extension".
    *   **Scopes:** Check the **`repo`** box (this gives permission to create issues and upload images).
    *   Click **Generate token** and copy the string (starts with `ghp_...`).

2.  **Setup Extension:**
    *   Click the extension icon.
    *   Paste your **Token**.
    *   Enter the **Owner** (e.g., `microsoft` or your username).
    *   Enter the **Repository Name** (e.g., `vscode`).
    *   Click **Save Settings**.

## 📖 Usage

1.  **Drafting:** Enter a Title and Body for your issue.
2.  **Images:** Paste screenshots directly into the body or use the attach button.
3.  **Labels:** Click the pill-shaped tags to toggle labels. They use the actual colors from your GitHub repo!
4.  **Submit:** Click **Create Issue**. You'll get a direct link to the new issue upon success.

## 🔒 Privacy

This extension is client-side only. It does not track you, and your GitHub tokens are stored only on your local device (Chrome Sync Storage).

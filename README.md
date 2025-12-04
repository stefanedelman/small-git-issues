# GitHub Issue Creator Extension

A simple and efficient Google Chrome extension that allows you to create GitHub issues directly from your browser toolbar, without navigating away from your current page.

## 🚀 Features

*   **Quick Issue Creation:** Instantly open a popup to draft and submit issues.
*   **Auto-Save Settings:** Remembers your Personal Access Token, Repository Owner, and Repository Name so you don't have to type them every time.
*   **Assignees:** Easily assign team members to issues (Advanced Options).
*   **Dark Mode:** Built-in dark mode support for late-night coding sessions. 🌙
*   **Secure:** Your token is stored locally in your browser's sync storage and is only used to communicate directly with the GitHub API.

## 🛠️ Installation

Since this is a local developer extension, you will need to install it in "Developer Mode".

1.  **Download/Clone** this folder to your computer.
2.  Open Google Chrome and navigate to `chrome://extensions`.
3.  Toggle **Developer mode** in the top right corner.
4.  Click the **Load unpacked** button.
5.  Select the folder containing this extension (where `manifest.json` is located).
6.  The extension should now appear in your toolbar! (Pin it for easy access).

## ⚙️ Configuration

To use the extension, you need a GitHub Personal Access Token (PAT).

1.  **Generate a Token:**
    *   Go to [GitHub Settings > Developer settings > Personal access tokens > Tokens (classic)](https://github.com/settings/tokens).
    *   Click **Generate new token** -> **Generate new token (classic)**.
    *   **Note:** Give it a name like "Issue Extension".
    *   **Scopes:** Check the **`repo`** box (this gives permission to create issues).
    *   Click **Generate token** and copy the string (starts with `ghp_...`).

2.  **Setup Extension:**
    *   Click the extension icon.
    *   Paste your **Token**.
    *   Enter the **Owner** (e.g., `microsoft` or your username).
    *   Enter the **Repository Name** (e.g., `vscode`).
    *   These details will be saved automatically.

## 📖 Usage

1.  Click the extension icon.
2.  Enter a **Title** and **Body** for your issue.
3.  (Optional) Expand **Advanced Options** to add assignees (comma-separated usernames).
4.  Click **Create Issue**.
5.  A success message will appear with a link to your new issue!

## 🎨 Customization

*   **Dark Mode:** Click the moon/sun icon in the top right to toggle themes.
*   **Settings:** The configuration fields (Token/Repo) automatically collapse after being saved to keep the interface clean. Click "Settings" to re-open them.

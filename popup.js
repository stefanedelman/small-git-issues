document.addEventListener('DOMContentLoaded', () => {
    const tokenInput = document.getElementById('token');
    const ownerInput = document.getElementById('owner');
    const repoNameInput = document.getElementById('repoName');
    const titleInput = document.getElementById('title');
    const bodyInput = document.getElementById('body');
    const assigneesInput = document.getElementById('assignees');
    const submitBtn = document.getElementById('submit');
    const statusDiv = document.getElementById('status');
    const themeToggle = document.getElementById('theme-toggle');
    const settingsDetails = document.getElementById('settings-details');

    // Load saved settings
    chrome.storage.sync.get(['githubToken', 'githubOwner', 'githubRepoName', 'githubAssignees', 'darkMode'], (items) => {
        if (items.githubToken) tokenInput.value = items.githubToken;
        if (items.githubOwner) ownerInput.value = items.githubOwner;
        if (items.githubRepoName) repoNameInput.value = items.githubRepoName;
        if (items.githubAssignees) assigneesInput.value = items.githubAssignees;
        
        // Apply Dark Mode
        if (items.darkMode) {
            document.body.classList.add('dark-mode');
            themeToggle.innerHTML = '&#9728;&#65039;'; // Sun icon
        }

        // Auto-collapse settings if configured
        if (items.githubToken && items.githubOwner && items.githubRepoName) {
            settingsDetails.removeAttribute('open');
        }
    });

    // Theme Toggle Listener
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        themeToggle.innerHTML = isDark ? '&#9728;&#65039;' : '&#127769;'; // Sun : Moon
        chrome.storage.sync.set({ darkMode: isDark });
    });

    submitBtn.addEventListener('click', async () => {
        const token = tokenInput.value.trim();
        const owner = ownerInput.value.trim();
        const repoName = repoNameInput.value.trim();
        const title = titleInput.value.trim();
        const body = bodyInput.value.trim();
        const assigneesRaw = assigneesInput.value;

        if (!token || !owner || !repoName || !title) {
            showStatus('Please fill in Token, Owner, Repo Name, and Title.', 'error');
            return;
        }

        // Save settings for next time
        chrome.storage.sync.set({
            githubToken: token,
            githubOwner: owner,
            githubRepoName: repoName,
            githubAssignees: assigneesRaw
        });

        const repo = `${owner}/${repoName}`;

        const assignees = assigneesRaw 
            ? assigneesRaw.split(',').map(s => s.trim()).filter(s => s.length > 0) 
            : [];

        submitBtn.disabled = true;
        showStatus('Creating issue...', 'info');

        try {
            const response = await fetch(`https://api.github.com/repos/${repo}/issues`, {
                method: 'POST',
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: title,
                    body: body,
                    assignees: assignees
                })
            });

            if (response.ok) {
                const data = await response.json();
                showStatus(`Issue created successfully! <a href="${data.html_url}" target="_blank">View Issue</a>`, 'success');
                titleInput.value = '';
                bodyInput.value = '';
            } else {
                const errorData = await response.json();
                if (response.status === 404) {
                    showStatus(`Error: Repo not found. Check format "owner/repo" and token permissions.`, 'error');
                } else {
                    showStatus(`Error: ${errorData.message}`, 'error');
                }
            }
        } catch (error) {
            showStatus(`Network Error: ${error.message}`, 'error');
        } finally {
            submitBtn.disabled = false;
        }
    });

    function showStatus(message, type) {
        statusDiv.innerHTML = message;
        statusDiv.className = type;
    }
});
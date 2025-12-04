document.addEventListener('DOMContentLoaded', () => {
    const tokenInput = document.getElementById('token');
    const ownerInput = document.getElementById('owner');
    const repoNameInput = document.getElementById('repoName');
    const titleInput = document.getElementById('title');
    const bodyInput = document.getElementById('body');
    const assigneesInput = document.getElementById('assignees');
    const labelsContainer = document.getElementById('labels-container');
    const submitBtn = document.getElementById('submit');
    const statusDiv = document.getElementById('status');
    const themeToggle = document.getElementById('theme-toggle');
    const settingsDetails = document.getElementById('settings-details');
    const saveSettingsBtn = document.getElementById('save-settings');
    const currentRepoDisplay = document.getElementById('current-repo-display');

    let selectedLabels = new Set();

    function updateRepoDisplay(owner, repoName) {
        if (owner && repoName) {
            currentRepoDisplay.textContent = `${owner}/${repoName}`;
        } else {
            currentRepoDisplay.textContent = 'No repository selected';
        }
    }

    async function fetchLabels(token, owner, repoName) {
        if (!token || !owner || !repoName) return;

        labelsContainer.innerHTML = '<div class="label-loading">Loading labels...</div>';
        
        try {
            const response = await fetch(`https://api.github.com/repos/${owner}/${repoName}/labels`, {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (response.ok) {
                const labels = await response.json();
                renderLabels(labels);
            } else {
                labelsContainer.innerHTML = '<div class="label-loading">Failed to load labels</div>';
            }
        } catch (error) {
            labelsContainer.innerHTML = `<div class="label-loading">Error: ${error.message}</div>`;
        }
    }

    function renderLabels(labels) {
        labelsContainer.innerHTML = '';
        if (labels.length === 0) {
            labelsContainer.innerHTML = '<div class="label-loading">No labels found</div>';
            return;
        }

        labels.forEach(label => {
            const chip = document.createElement('div');
            chip.className = 'label-chip';
            chip.textContent = label.name;
            // Optional: Use label color from GitHub
            // chip.style.borderLeft = `3px solid #${label.color}`;
            
            if (selectedLabels.has(label.name)) {
                chip.classList.add('selected');
            }

            chip.addEventListener('click', () => {
                if (selectedLabels.has(label.name)) {
                    selectedLabels.delete(label.name);
                    chip.classList.remove('selected');
                } else {
                    selectedLabels.add(label.name);
                    chip.classList.add('selected');
                }
            });

            labelsContainer.appendChild(chip);
        });
    }

    function showStatus(message, type) {
        statusDiv.innerHTML = message;
        statusDiv.className = type;
    }

    // Load saved settings
    chrome.storage.sync.get(['githubToken', 'githubOwner', 'githubRepoName', 'githubAssignees', 'darkMode'], (items) => {
        if (items.githubToken) tokenInput.value = items.githubToken;
        if (items.githubOwner) ownerInput.value = items.githubOwner;
        if (items.githubRepoName) repoNameInput.value = items.githubRepoName;
        if (items.githubAssignees) assigneesInput.value = items.githubAssignees;
        
        updateRepoDisplay(items.githubOwner, items.githubRepoName);

        // Fetch labels if we have credentials
        if (items.githubToken && items.githubOwner && items.githubRepoName) {
            fetchLabels(items.githubToken, items.githubOwner, items.githubRepoName);
        }

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

    // Save Settings Button Listener
    saveSettingsBtn.addEventListener('click', () => {
        const token = tokenInput.value.trim();
        const owner = ownerInput.value.trim();
        const repoName = repoNameInput.value.trim();
        const assigneesRaw = assigneesInput.value;

        chrome.storage.sync.set({
            githubToken: token,
            githubOwner: owner,
            githubRepoName: repoName,
            githubAssignees: assigneesRaw
        }, () => {
            updateRepoDisplay(owner, repoName);
            fetchLabels(token, owner, repoName); // Refresh labels on save
            showStatus('Settings saved!', 'success');
            setTimeout(() => {
                statusDiv.innerHTML = '';
                // Optional: Collapse settings if they are valid
                if (token && owner && repoName) {
                    settingsDetails.removeAttribute('open');
                }
            }, 1500);
        });
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

        const labels = Array.from(selectedLabels);

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
                    assignees: assignees,
                    labels: labels
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
});
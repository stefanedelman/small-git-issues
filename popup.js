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
    const advancedOptionsDetails = document.getElementById('advanced-options-details');
    const saveSettingsBtn = document.getElementById('save-settings');
    const currentRepoDisplay = document.getElementById('current-repo-display');
    const attachImageBtn = document.getElementById('attach-image-btn');
    const imageInput = document.getElementById('image-input');
    const uploadStatus = document.getElementById('upload-status');
    
    // Custom Select Elements
    const repoSelectTrigger = document.getElementById('repo-select-trigger');
    const repoSelectText = document.getElementById('repo-select-text');
    const repoSelectDropdown = document.getElementById('repo-select-dropdown');
    const repoSearchInput = document.getElementById('repo-search');
    const repoOptionsList = document.getElementById('repo-options-list');

    // Assignee Select Elements
    const assigneeSelectTrigger = document.getElementById('assignee-select-trigger');
    const assigneeSelectText = document.getElementById('assignee-select-text');
    const assigneeSelectDropdown = document.getElementById('assignee-select-dropdown');
    const assigneeOptionsList = document.getElementById('assignee-options-list');

    let selectedLabels = new Set();
    let selectedAssignees = new Set();
    let allFetchedRepos = [];
    let allStarredIds = new Set();

    // Toggle Dropdown
    repoSelectTrigger.addEventListener('click', () => {
        if (repoSelectTrigger.classList.contains('disabled')) return;
        const isClosed = repoSelectDropdown.style.display === 'none';
        repoSelectDropdown.style.display = isClosed ? 'block' : 'none';
        if (isClosed) {
            repoSelectTrigger.classList.add('is-open');
            repoSearchInput.focus();
            assigneeSelectDropdown.style.display = 'none'; // Close other dropdown
            assigneeSelectTrigger.classList.remove('is-open');
        } else {
            repoSelectTrigger.classList.remove('is-open');
        }
    });

    // Toggle Assignee Dropdown
    assigneeSelectTrigger.addEventListener('click', () => {
        if (assigneeSelectTrigger.classList.contains('disabled')) return;
        const isClosed = assigneeSelectDropdown.style.display === 'none';
        assigneeSelectDropdown.style.display = isClosed ? 'block' : 'none';
        if (isClosed) {
            assigneeSelectTrigger.classList.add('is-open');
            repoSelectDropdown.style.display = 'none'; // Close other dropdown
            repoSelectTrigger.classList.remove('is-open');
        } else {
            assigneeSelectTrigger.classList.remove('is-open');
        }
    });

    // Search Repos
    repoSearchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = allFetchedRepos.filter(repo => 
            repo.name.toLowerCase().includes(query) || 
            repo.owner.login.toLowerCase().includes(query)
        );
        renderRepoOptions(filtered, allStarredIds);
    });

    // Prevent closing when clicking search
    repoSearchInput.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!repoSelectTrigger.contains(e.target) && !repoSelectDropdown.contains(e.target)) {
            repoSelectDropdown.style.display = 'none';
            repoSelectTrigger.classList.remove('is-open');
        }
        if (!assigneeSelectTrigger.contains(e.target) && !assigneeSelectDropdown.contains(e.target)) {
            assigneeSelectDropdown.style.display = 'none';
            assigneeSelectTrigger.classList.remove('is-open');
        }
    });

    // Auto-load repos when owner changes
    ownerInput.addEventListener('blur', () => {
        const token = tokenInput.value.trim();
        const owner = ownerInput.value.trim();
        if (token) {
            fetchRepositories(token, owner);
        }
    });

    async function fetchRepositories(token, owner) {
        if (!token) {
            showStatus('Please enter a Personal Access Token first.', 'error');
            return;
        }

        repoSelectText.textContent = 'Loading...';
        repoSelectTrigger.classList.add('disabled');
        repoOptionsList.innerHTML = '<div class="select-option" style="color: #586069; cursor: default;">Loading repositories...</div>';
        repoSearchInput.value = ''; // Clear search

        try {
            // 1. Identify the authenticated user
            const userRes = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (!userRes.ok) {
                throw new Error('Invalid Token or Network Error');
            }
            
            const userData = await userRes.json();
            const authLogin = userData.login;

            if (!owner) {
                ownerInput.value = authLogin;
            }

            // 2. Determine if we are fetching for the auth user or someone else
            // If owner is empty OR matches the authenticated user, use /user/repos
            const isAuthUser = !owner || (owner.toLowerCase() === authLogin.toLowerCase());

            let allRepos = [];
            let page = 1;
            const perPage = 100;
            let hasMore = true;

            const baseUrl = isAuthUser 
                ? 'https://api.github.com/user/repos'
                : `https://api.github.com/users/${owner}/repos`;

            // Start fetching starred repos in parallel
            const starredPromise = fetch('https://api.github.com/user/starred?per_page=100', {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            }).then(res => res.ok ? res.json() : []).catch(() => []);

            while (hasMore && page <= 5) { // Limit to 5 pages (500 repos)
                let url = `${baseUrl}?sort=updated&per_page=${perPage}&page=${page}`;
                
                if (isAuthUser) {
                    // visibility=all ensures private repos are included
                    // affiliation ensures we get repos we own, collaborate on, or have org access to
                    url += '&visibility=all&affiliation=owner,collaborator,organization_member';
                }

                const response = await fetch(url, {
                    headers: {
                        'Authorization': `token ${token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });

                if (response.ok) {
                    const repos = await response.json();
                    if (repos.length === 0) {
                        hasMore = false;
                    } else {
                        allRepos = allRepos.concat(repos);
                        if (repos.length < perPage) {
                            hasMore = false;
                        } else {
                            page++;
                        }
                    }
                } else {
                    const err = await response.json();
                    throw new Error(err.message);
                }
            }

            const starredRepos = await starredPromise;
            allStarredIds = new Set(starredRepos.map(r => r.id));
            allFetchedRepos = allRepos;

            renderRepoOptions(allRepos, allStarredIds);
            showStatus(`Loaded ${allRepos.length} repositories for ${isAuthUser ? authLogin : owner}.`, 'success');

        } catch (error) {
            showStatus(`Failed to load repos: ${error.message}`, 'error');
            repoSelectText.textContent = 'Error loading repos';
        } finally {
            repoSelectTrigger.classList.remove('disabled');
        }
    }

    function renderRepoOptions(repos, starredIds = new Set()) {
        repoOptionsList.innerHTML = '';
        
        if (repos.length === 0) {
            const noResults = document.createElement('div');
            noResults.style.padding = '8px 12px';
            noResults.style.color = '#586069';
            noResults.style.fontSize = '13px';
            noResults.textContent = 'No repositories found';
            repoOptionsList.appendChild(noResults);
            return;
        }

        const grouped = {};
        repos.forEach(repo => {
            const owner = repo.owner.login;
            if (!grouped[owner]) grouped[owner] = [];
            grouped[owner].push(repo);
        });

        Object.keys(grouped).sort().forEach(owner => {
            const groupLabel = document.createElement('div');
            groupLabel.className = 'select-group-label';
            groupLabel.textContent = owner;
            repoOptionsList.appendChild(groupLabel);
            
            grouped[owner].sort((a, b) => a.name.localeCompare(b.name)).forEach(repo => {
                const option = document.createElement('div');
                option.className = 'select-option';
                
                const nameSpan = document.createElement('span');
                nameSpan.textContent = repo.name;
                option.appendChild(nameSpan);

                if (starredIds.has(repo.id)) {
                    // Add SVG Star
                    option.innerHTML += `<svg viewBox="0 0 16 16" width="14" height="14" class="star-icon"><path fill-rule="evenodd" d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.719-4.192-3.046-2.97a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z"></path></svg>`;
                }

                option.addEventListener('click', () => {
                    const fullRepo = `${repo.owner.login}/${repo.name}`;
                    repoNameInput.value = fullRepo;
                    repoSelectText.textContent = repo.name;
                    repoSelectDropdown.style.display = 'none';
                    repoSelectTrigger.classList.remove('is-open');
                    
                    // Trigger change logic
                    const [rOwner, rName] = fullRepo.split('/');
                    updateRepoDisplay(rOwner, rName);
                    fetchLabels(tokenInput.value.trim(), rOwner, rName);
                    fetchAssignees(tokenInput.value.trim(), rOwner, rName);
                });
                
                repoOptionsList.appendChild(option);
            });
        });
        
        const currentVal = repoNameInput.value;
        if (currentVal && currentVal.includes('/')) {
             const [, currentRepo] = currentVal.split('/');
             repoSelectText.textContent = currentRepo;
        } else {
             repoSelectText.textContent = 'Select a repository';
        }
    }

    repoNameInput.addEventListener('change', () => {
        const val = repoNameInput.value;
        if (val) {
            const [owner, repo] = val.split('/');
            updateRepoDisplay(owner, repo);
            
            // Clear previous selections when changing repo
            selectedAssignees.clear();
            updateAssigneeText();
            
            fetchLabels(tokenInput.value.trim(), owner, repo);
            fetchAssignees(tokenInput.value.trim(), owner, repo);
        }
    });

    function updateRepoDisplay(owner, repoName) {
        if (owner && repoName) {
            currentRepoDisplay.innerHTML = `
                <div>${owner}/${repoName}</div>
                <a href="https://github.com/${owner}/${repoName}" target="_blank" class="repo-link">Open in new tab &#8599;</a>
            `;
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

    async function fetchAssignees(token, owner, repoName) {
        if (!token || !owner || !repoName) return;

        assigneeSelectText.textContent = 'Loading...';
        assigneeOptionsList.innerHTML = '';
        
        try {
            const response = await fetch(`https://api.github.com/repos/${owner}/${repoName}/assignees`, {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (response.ok) {
                const assignees = await response.json();
                renderAssignees(assignees);
            } else {
                assigneeSelectText.textContent = 'Failed to load';
            }
        } catch (error) {
            assigneeSelectText.textContent = 'Error loading';
        }
    }

    function renderAssignees(assignees) {
        assigneeOptionsList.innerHTML = '';
        assigneeSelectText.textContent = 'Select assignees';

        if (assignees.length === 0) {
            const noResults = document.createElement('div');
            noResults.style.padding = '8px 12px';
            noResults.style.color = '#586069';
            noResults.style.fontSize = '13px';
            noResults.textContent = 'No assignees found';
            assigneeOptionsList.appendChild(noResults);
            return;
        }

        assignees.forEach(user => {
            const option = document.createElement('div');
            option.className = 'select-option';
            
            // Checkbox-like appearance
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.style.marginRight = '8px';
            checkbox.style.pointerEvents = 'none'; // Let the div handle click
            
            const avatar = document.createElement('img');
            avatar.src = user.avatar_url;
            avatar.style.width = '20px';
            avatar.style.height = '20px';
            avatar.style.borderRadius = '50%';
            avatar.style.marginRight = '8px';
            avatar.style.verticalAlign = 'middle';

            const nameSpan = document.createElement('span');
            nameSpan.textContent = user.login;

            if (selectedAssignees.has(user.login)) {
                checkbox.checked = true;
                option.classList.add('selected');
            }

            option.appendChild(checkbox);
            option.appendChild(avatar);
            option.appendChild(nameSpan);

            option.addEventListener('click', () => {
                if (selectedAssignees.has(user.login)) {
                    selectedAssignees.delete(user.login);
                    checkbox.checked = false;
                    option.classList.remove('selected');
                } else {
                    selectedAssignees.add(user.login);
                    checkbox.checked = true;
                    option.classList.add('selected');
                }
                updateAssigneeText();
            });
            
            assigneeOptionsList.appendChild(option);
        });
        
        updateAssigneeText();
    }

    function updateAssigneeText() {
        const count = selectedAssignees.size;
        if (count === 0) {
            assigneeSelectText.textContent = 'Select assignees';
        } else if (count === 1) {
            assigneeSelectText.textContent = Array.from(selectedAssignees)[0];
        } else {
            assigneeSelectText.textContent = `${count} assignees selected`;
        }
        assigneesInput.value = Array.from(selectedAssignees).join(', ');
    }

    function hexToRgb(hex) {
        var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(shorthandRegex, function(m, r, g, b) {
            return r + r + g + g + b + b;
        });

        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    function getContrastYIQ(hexcolor){
        var r = parseInt(hexcolor.substr(0,2),16);
        var g = parseInt(hexcolor.substr(2,2),16);
        var b = parseInt(hexcolor.substr(4,2),16);
        var yiq = ((r*299)+(g*587)+(b*114))/1000;
        return (yiq >= 128) ? 'black' : 'white';
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
            
            // Apply Styles via CSS Variables
            const rgb = hexToRgb(label.color);
            const contrast = getContrastYIQ(label.color);
            
            if (rgb) {
                chip.style.setProperty('--label-r', rgb.r);
                chip.style.setProperty('--label-g', rgb.g);
                chip.style.setProperty('--label-b', rgb.b);
                chip.style.setProperty('--label-color', `#${label.color}`);
                chip.style.setProperty('--label-text-contrast', contrast);
            }

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
    chrome.storage.sync.get(['githubToken', 'githubOwner', 'githubRepoName', 'githubAssignees', 'darkMode', 'advancedOptionsOpen'], (items) => {
        if (items.githubToken) tokenInput.value = items.githubToken;
        if (items.githubOwner) ownerInput.value = items.githubOwner;
        if (items.githubAssignees) {
            assigneesInput.value = items.githubAssignees;
            items.githubAssignees.split(',').map(s => s.trim()).forEach(s => {
                if (s) selectedAssignees.add(s);
            });
            updateAssigneeText();
        }
        
        // Handle Repo Select
        if (items.githubRepoName) {
            let owner = items.githubOwner;
            let repo = items.githubRepoName;
            let fullRepoValue = items.githubRepoName;

            // Handle legacy or split format
            if (!repo.includes('/') && owner) {
                fullRepoValue = `${owner}/${repo}`;
            } else if (repo.includes('/')) {
                [owner, repo] = repo.split('/');
            }

            // Update Custom Select UI
            repoNameInput.value = fullRepoValue;
            repoSelectText.textContent = repo;

            updateRepoDisplay(owner, repo);
            
            if (items.githubToken) {
                fetchLabels(items.githubToken, owner, repo);
                fetchAssignees(items.githubToken, owner, repo);
            }
        }

        // Apply Dark Mode
        if (items.darkMode) {
            document.body.classList.add('dark-mode');
            themeToggle.innerHTML = '&#9728;&#65039;'; // Sun icon
        }

        // Restore Advanced Options State
        if (items.advancedOptionsOpen) {
            advancedOptionsDetails.open = true;
        }

        // Auto-collapse settings if configured
        if (items.githubToken && items.githubRepoName) {
            settingsDetails.removeAttribute('open');
        }

        // Auto-load repos if token is present
        if (items.githubToken) {
            fetchRepositories(items.githubToken, items.githubOwner);
        }
    });

    // Save Advanced Options State
    advancedOptionsDetails.addEventListener('toggle', () => {
        chrome.storage.sync.set({ advancedOptionsOpen: advancedOptionsDetails.open });
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
        const originalText = saveSettingsBtn.textContent;
        saveSettingsBtn.disabled = true;
        saveSettingsBtn.innerHTML = '<span class="spinner"></span> Saving...';

        const token = tokenInput.value.trim();
        const owner = ownerInput.value.trim();
        const repoFull = repoNameInput.value;
        const assigneesRaw = assigneesInput.value;

        chrome.storage.sync.set({
            githubToken: token,
            githubOwner: owner,
            githubRepoName: repoFull,
            githubAssignees: assigneesRaw
        }, () => {
            if (repoFull) {
                const [rOwner, rName] = repoFull.split('/');
                updateRepoDisplay(rOwner, rName);
                fetchLabels(token, rOwner, rName);
            }
            showStatus('Settings saved!', 'success');
            
            setTimeout(() => {
                saveSettingsBtn.innerHTML = originalText;
                saveSettingsBtn.disabled = false;
                statusDiv.innerHTML = '';
                // Optional: Collapse settings if they are valid
                if (token && repoFull) {
                    settingsDetails.removeAttribute('open');
                }
            }, 1000);
        });
    });

    // Image Upload Logic
    attachImageBtn.addEventListener('click', () => {
        imageInput.click();
    });

    imageInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            uploadImage(e.target.files[0]);
        }
    });

    bodyInput.addEventListener('paste', (e) => {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (let index in items) {
            const item = items[index];
            if (item.kind === 'file' && item.type.startsWith('image/')) {
                const blob = item.getAsFile();
                uploadImage(blob);
            }
        }
    });

    function readFileAsBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                // Remove "data:image/png;base64," prefix
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async function uploadImage(file) {
        const token = tokenInput.value.trim();
        const repoFull = repoNameInput.value;

        if (!token || !repoFull) {
            showStatus('Please configure Token and Repo first.', 'error');
            return;
        }

        uploadStatus.textContent = 'Uploading...';
        attachImageBtn.disabled = true;

        try {
            const content = await readFileAsBase64(file);
            const timestamp = new Date().getTime();
            // Simple random string to avoid collisions
            const randomStr = Math.random().toString(36).substring(7);
            const filename = `issue-images/img-${timestamp}-${randomStr}.png`;
            
            const response = await fetch(`https://api.github.com/repos/${repoFull}/contents/${filename}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: `Upload image ${filename}`,
                    content: content
                })
            });

            if (response.ok) {
                const data = await response.json();
                const imageUrl = data.content.download_url;
                const markdown = `\n![Image](${imageUrl})\n`;
                
                // Insert at cursor
                const startPos = bodyInput.selectionStart;
                const endPos = bodyInput.selectionEnd;
                bodyInput.value = bodyInput.value.substring(0, startPos)
                    + markdown
                    + bodyInput.value.substring(endPos, bodyInput.value.length);
                
                uploadStatus.textContent = 'Uploaded!';
                setTimeout(() => uploadStatus.textContent = '', 2000);
            } else {
                const error = await response.json();
                uploadStatus.textContent = 'Failed';
                showStatus(`Upload failed: ${error.message}`, 'error');
            }
        } catch (error) {
            uploadStatus.textContent = 'Error';
            showStatus(`Upload error: ${error.message}`, 'error');
        } finally {
            attachImageBtn.disabled = false;
            imageInput.value = ''; // Reset
        }
    }

    submitBtn.addEventListener('click', async () => {
        const token = tokenInput.value.trim();
        const owner = ownerInput.value.trim();
        const repoFull = repoNameInput.value;
        const title = titleInput.value.trim();
        const body = bodyInput.value.trim();
        const assigneesRaw = assigneesInput.value;

        if (!token || !repoFull || !title) {
            showStatus('Please fill in Token, Repo Name, and Title.', 'error');
            return;
        }

        // Save settings for next time
        chrome.storage.sync.set({
            githubToken: token,
            githubOwner: owner,
            githubRepoName: repoFull,
            githubAssignees: assigneesRaw
        });

        const assignees = assigneesRaw 
            ? assigneesRaw.split(',').map(s => s.trim()).filter(s => s.length > 0) 
            : [];

        const labels = Array.from(selectedLabels);

        submitBtn.disabled = true;
        showStatus('Creating issue...', 'info');

        try {
            const response = await fetch(`https://api.github.com/repos/${repoFull}/issues`, {
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
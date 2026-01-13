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
    const advancedOptionsDetails = document.getElementById('advanced-options-details');
    const saveSettingsBtn = document.getElementById('save-settings');
    const saveImageSettingsBtn = document.getElementById('save-image-settings');
    const currentRepoDisplay = document.getElementById('current-repo-display');
    const attachImageBtn = document.getElementById('attach-image-btn');
    const clearDraftBtn = document.getElementById('clear-draft-btn');
    const imageInput = document.getElementById('image-input');
    const uploadStatus = document.getElementById('upload-status');
    const imageTokenInput = document.getElementById('image-token');
    const imageRepoInput = document.getElementById('image-repo');

    // Image Repo Select Elements
    const imageRepoSelectTrigger = document.getElementById('image-repo-select-trigger');
    const imageRepoSelectText = document.getElementById('image-repo-select-text');
    const imageRepoSelectDropdown = document.getElementById('image-repo-select-dropdown');
    const imageRepoSearchInput = document.getElementById('image-repo-search');
    const imageRepoOptionsList = document.getElementById('image-repo-options-list');

    // Modal Elements
    const imageInfoModal = document.getElementById('image-info-modal');
    const imageHelpIcon = document.getElementById('image-help-icon');
    const modalGoSettings = document.getElementById('modal-go-settings');
    const modalClose = document.getElementById('modal-close');
    
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

    // Issues View State
    let allFetchedIssues = [];  // Filtered view
    let masterIssuesCache = []; // All issues (open + closed)
    let issuesPage = 1;
    let hasMoreIssues = true;
    let lastFetchedState = null; // Track what state we last fetched

    // View Toggle Elements
    const tabCreate = document.getElementById('tab-create');
    const tabIssues = document.getElementById('tab-issues');
    const tabSettings = document.getElementById('tab-settings');
    const createView = document.getElementById('create-view');
    const issuesView = document.getElementById('issues-view');
    const settingsView = document.getElementById('settings-view');
    const issuesStateFilter = document.getElementById('issues-state-filter');
    const refreshIssuesBtn = document.getElementById('refresh-issues-btn');
    const issuesList = document.getElementById('issues-list');
    const loadMoreIssuesBtn = document.getElementById('load-more-issues');
    const issueDetailPanel = document.getElementById('issue-detail-panel');
    const issuesListPanel = document.getElementById('issues-list-panel');
    const closeIssueDetailBtn = document.getElementById('close-issue-detail');
    const issueDetailContent = document.getElementById('issue-detail-content');
    const issueGithubLink = document.getElementById('issue-github-link');
    const newCommentInput = document.getElementById('new-comment-input');
    const submitCommentBtn = document.getElementById('submit-comment-btn');
    const closeIssueBtn = document.getElementById('close-issue-btn');
    const closeConfirm = document.getElementById('close-confirm');
    const confirmCloseBtn = document.getElementById('confirm-close-btn');
    const cancelCloseBtn = document.getElementById('cancel-close-btn');

    let currentOpenIssue = null; // Track currently open issue
    let restoredActiveTab = 'create';

    // --- Autosave & Draft Logic ---
    chrome.storage.local.get(['draftTitle', 'draftBody'], (items) => {
        if (items.draftTitle) titleInput.value = items.draftTitle;
        if (items.draftBody) bodyInput.value = items.draftBody;
    });

    function saveDraft() {
        chrome.storage.local.set({
            draftTitle: titleInput.value,
            draftBody: bodyInput.value
        });
    }

    titleInput.addEventListener('input', saveDraft);
    bodyInput.addEventListener('input', saveDraft);

    clearDraftBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear the title and body?')) {
            titleInput.value = '';
            bodyInput.value = '';
            saveDraft();
        }
    });

    // Keyboard Shortcut (Ctrl/Cmd + Enter)
    function handleShortcut(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            submitBtn.click();
        }
    }
    titleInput.addEventListener('keydown', handleShortcut);
    bodyInput.addEventListener('keydown', handleShortcut);
    // ------------------------------

    // --- View Toggle Logic ---
    function switchView(view, saveToStorage = true) {
        // Hide all views
        createView.style.display = 'none';
        issuesView.style.display = 'none';
        settingsView.style.display = 'none';
        tabCreate.classList.remove('active');
        tabIssues.classList.remove('active');
        tabSettings.classList.remove('active');

        if (view === 'create') {
            createView.style.display = 'block';
            tabCreate.classList.add('active');
        } else if (view === 'issues') {
            issuesView.style.display = 'block';
            tabIssues.classList.add('active');
            // Only fetch issues if we don't have cached data
            const repoFull = repoNameInput.value;
            if (repoFull && allFetchedIssues.length === 0) {
                fetchIssues(true);
            } else if (repoFull && allFetchedIssues.length > 0) {
                // Just render the cached issues
                renderIssuesList();
            }
        } else if (view === 'settings') {
            settingsView.style.display = 'block';
            tabSettings.classList.add('active');
        }
        if (saveToStorage) {
            chrome.storage.local.set({ activeTab: view });
        }
    }

    tabCreate.addEventListener('click', () => switchView('create'));
    tabIssues.addEventListener('click', () => switchView('issues'));
    tabSettings.addEventListener('click', () => switchView('settings'));

    // --- Modal Logic ---
    imageHelpIcon.addEventListener('click', () => {
        imageInfoModal.style.display = 'flex';
    });

    modalClose.addEventListener('click', () => {
        imageInfoModal.style.display = 'none';
    });

    modalGoSettings.addEventListener('click', () => {
        imageInfoModal.style.display = 'none';
        switchView('settings');
    });

    imageInfoModal.addEventListener('click', (e) => {
        if (e.target === imageInfoModal) {
            imageInfoModal.style.display = 'none';
        }
    });
    // -------------------

    // --- Image Repo Select Logic ---
    imageRepoSelectTrigger.addEventListener('click', () => {
        const isClosed = imageRepoSelectDropdown.style.display === 'none';
        imageRepoSelectDropdown.style.display = isClosed ? 'block' : 'none';
        if (isClosed) {
            imageRepoSelectTrigger.classList.add('is-open');
            // Close other dropdowns
            repoSelectDropdown.style.display = 'none';
            repoSelectTrigger.classList.remove('is-open');
            assigneeSelectDropdown.style.display = 'none';
            assigneeSelectTrigger.classList.remove('is-open');
            renderImageRepoOptions(allFetchedRepos);
        } else {
            imageRepoSelectTrigger.classList.remove('is-open');
        }
    });

    imageRepoSearchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = allFetchedRepos.filter(repo => 
            repo.name.toLowerCase().includes(query) || 
            repo.owner.login.toLowerCase().includes(query)
        );
        renderImageRepoOptions(filtered);
    });

    imageRepoSearchInput.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    function renderImageRepoOptions(repos) {
        imageRepoOptionsList.innerHTML = '';
        
        if (repos.length === 0) {
            const noResults = document.createElement('div');
            noResults.style.padding = '8px 12px';
            noResults.style.color = '#586069';
            noResults.style.fontSize = '13px';
            noResults.textContent = 'No repositories found';
            imageRepoOptionsList.appendChild(noResults);
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
            imageRepoOptionsList.appendChild(groupLabel);
            
            grouped[owner].sort((a, b) => a.name.localeCompare(b.name)).forEach(repo => {
                const option = document.createElement('div');
                option.className = 'select-option';
                option.textContent = repo.name;

                option.addEventListener('click', () => {
                    const fullRepo = `${repo.owner.login}/${repo.name}`;
                    imageRepoInput.value = fullRepo;
                    imageRepoSelectText.textContent = repo.name;
                    imageRepoSelectDropdown.style.display = 'none';
                    imageRepoSelectTrigger.classList.remove('is-open');
                });
                
                imageRepoOptionsList.appendChild(option);
            });
        });
        
        const currentVal = imageRepoInput.value;
        if (currentVal && currentVal.includes('/')) {
             const [, currentRepo] = currentVal.split('/');
             imageRepoSelectText.textContent = currentRepo;
        }
    }
    // -------------------------------

    // Restore active tab from storage
    chrome.storage.local.get(['activeTab'], (items) => {
        if (items.activeTab) {
            restoredActiveTab = items.activeTab;
            switchView(items.activeTab, false);
        }
    });

    // --- Issues Fetching Logic ---
    function filterIssuesFromCache(state) {
        if (state === 'all') {
            return [...masterIssuesCache];
        }
        return masterIssuesCache.filter(issue => issue.state === state);
    }

    async function fetchIssues(reset = false, forceRefresh = false) {
        const token = tokenInput.value.trim();
        const repoFull = repoNameInput.value;

        if (!token || !repoFull) {
            issuesList.innerHTML = '<div class="issues-placeholder">Please configure Token and Repository first</div>';
            return;
        }

        const state = issuesStateFilter.value;

        // If we have cached data and just changing filter (not forcing refresh), filter client-side
        if (!forceRefresh && masterIssuesCache.length > 0 && lastFetchedState === 'all') {
            allFetchedIssues = filterIssuesFromCache(state);
            renderIssuesList();
            return;
        }

        if (reset) {
            issuesPage = 1;
            allFetchedIssues = [];
            hasMoreIssues = true;
        }

        issuesList.innerHTML = '<div class="issue-loading">Loading issues...</div>';
        loadMoreIssuesBtn.style.display = 'none';

        try {
            // Always fetch 'all' to enable client-side filtering
            const fetchState = 'all';
            const response = await fetch(
                `https://api.github.com/repos/${repoFull}/issues?state=${fetchState}&per_page=50&page=${issuesPage}`,
                {
                    headers: {
                        'Authorization': `token ${token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );

            if (response.ok) {
                const issues = await response.json();
                // Filter out pull requests (GitHub API returns PRs in issues endpoint)
                const actualIssues = issues.filter(issue => !issue.pull_request);
                
                if (reset) {
                    masterIssuesCache = actualIssues;
                } else {
                    masterIssuesCache = masterIssuesCache.concat(actualIssues);
                }
                lastFetchedState = 'all';

                // Apply current filter
                allFetchedIssues = filterIssuesFromCache(state);
                hasMoreIssues = issues.length === 50;
                renderIssuesList();
            } else {
                const error = await response.json();
                issuesList.innerHTML = `<div class="issues-placeholder">Error: ${error.message}</div>`;
            }
        } catch (error) {
            issuesList.innerHTML = `<div class="issues-placeholder">Network error: ${error.message}</div>`;
        }
    }

    function renderIssuesList() {
        if (allFetchedIssues.length === 0) {
            issuesList.innerHTML = '<div class="issues-placeholder">No issues found</div>';
            loadMoreIssuesBtn.style.display = 'none';
            return;
        }

        issuesList.innerHTML = '';
        
        allFetchedIssues.forEach(issue => {
            const item = document.createElement('div');
            item.className = 'issue-item';
            
            const stateIcon = issue.state === 'open' 
                ? `<svg class="issue-state-icon open" viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
                     <path d="M8 9.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"></path>
                     <path fill-rule="evenodd" d="M8 0a8 8 0 100 16A8 8 0 008 0zM1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0z"></path>
                   </svg>`
                : `<svg class="issue-state-icon closed" viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
                     <path d="M11.28 6.78a.75.75 0 00-1.06-1.06L7.25 8.69 5.78 7.22a.75.75 0 00-1.06 1.06l2 2a.75.75 0 001.06 0l3.5-3.5z"></path>
                     <path fill-rule="evenodd" d="M16 8A8 8 0 110 8a8 8 0 0116 0zm-1.5 0a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z"></path>
                   </svg>`;

            // Build labels HTML
            let labelsHtml = '';
            if (issue.labels && issue.labels.length > 0) {
                labelsHtml = '<div class="issue-labels">';
                issue.labels.forEach(label => {
                    const contrast = getContrastYIQ(label.color);
                    labelsHtml += `<span class="issue-label" style="background-color: #${label.color}; color: ${contrast};">${label.name}</span>`;
                });
                labelsHtml += '</div>';
            }

            const timeAgo = getTimeAgo(new Date(issue.created_at));
            
            item.innerHTML = `
                <div class="issue-header">
                    ${stateIcon}
                    <div class="issue-content">
                        <div class="issue-title">${escapeHtml(issue.title)}</div>
                        <div class="issue-meta">#${issue.number} opened ${timeAgo} by ${issue.user.login}</div>
                        ${labelsHtml}
                    </div>
                </div>
            `;

            item.addEventListener('click', () => openIssueDetail(issue));
            issuesList.appendChild(item);
        });

        loadMoreIssuesBtn.style.display = hasMoreIssues ? 'block' : 'none';
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function getTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        
        const intervals = {
            year: 31536000,
            month: 2592000,
            week: 604800,
            day: 86400,
            hour: 3600,
            minute: 60
        };
        
        for (const [unit, secondsInUnit] of Object.entries(intervals)) {
            const interval = Math.floor(seconds / secondsInUnit);
            if (interval >= 1) {
                return interval === 1 ? `1 ${unit} ago` : `${interval} ${unit}s ago`;
            }
        }
        
        return 'just now';
    }

    // --- Issue Detail Panel Logic ---
    function openIssueDetail(issue) {
        currentOpenIssue = issue;
        issueDetailPanel.classList.add('open');
        issuesListPanel.classList.add('detail-open');
        issueGithubLink.href = issue.html_url;
        newCommentInput.value = '';
        closeConfirm.style.display = 'none';
        // Show close button only for open issues
        closeIssueBtn.style.display = issue.state === 'open' ? 'block' : 'none';
        // Hide header and repo display for more space
        document.querySelector('.header').style.display = 'none';
        currentRepoDisplay.style.display = 'none';
        document.querySelector('.view-tabs').style.display = 'none';
        renderIssueDetail(issue);
    }

    function closeIssueDetail() {
        currentOpenIssue = null;
        issueDetailPanel.classList.remove('open');
        issuesListPanel.classList.remove('detail-open');
        closeConfirm.style.display = 'none';
        // Show header and repo display again
        document.querySelector('.header').style.display = 'flex';
        currentRepoDisplay.style.display = 'block';
        document.querySelector('.view-tabs').style.display = 'flex';
    }

    async function renderIssueDetail(issue) {
        const stateClass = issue.state === 'open' ? 'open' : 'closed';
        const stateIcon = issue.state === 'open' 
            ? `<svg class="issue-state-icon open" viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
                 <path d="M8 9.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"></path>
                 <path fill-rule="evenodd" d="M8 0a8 8 0 100 16A8 8 0 008 0zM1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0z"></path>
               </svg>`
            : `<svg class="issue-state-icon closed" viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
                 <path d="M11.28 6.78a.75.75 0 00-1.06-1.06L7.25 8.69 5.78 7.22a.75.75 0 00-1.06 1.06l2 2a.75.75 0 001.06 0l3.5-3.5z"></path>
                 <path fill-rule="evenodd" d="M16 8A8 8 0 110 8a8 8 0 0116 0zm-1.5 0a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z"></path>
               </svg>`;

        // Build labels HTML
        let labelsHtml = '';
        if (issue.labels && issue.labels.length > 0) {
            labelsHtml = '<div class="issue-detail-labels">';
            issue.labels.forEach(label => {
                const contrast = getContrastYIQ(label.color);
                labelsHtml += `<span class="issue-label" style="background-color: #${label.color}; color: ${contrast};">${label.name}</span>`;
            });
            labelsHtml += '</div>';
        }

        const timeAgo = getTimeAgo(new Date(issue.created_at));
        const bodyHtml = issue.body ? escapeHtml(issue.body).replace(/\n/g, '<br>') : '<em>No description provided.</em>';

        issueDetailContent.innerHTML = `
            <div class="issue-detail-title-row">
                ${stateIcon}
                <h3 class="issue-detail-title">${escapeHtml(issue.title)}</h3>
            </div>
            <div class="issue-detail-meta">
                <span class="issue-state-badge ${stateClass}">${issue.state}</span>
                #${issue.number} opened ${timeAgo} by 
                <img src="${issue.user.avatar_url}" class="issue-detail-avatar" />
                <strong>${issue.user.login}</strong>
            </div>
            ${labelsHtml}
            <div class="issue-detail-body">${bodyHtml}</div>
            <div class="issue-detail-comments-header">Comments (${issue.comments})</div>
            <div id="issue-comments-list" class="issue-comments-list">
                ${issue.comments > 0 ? '<div class="issue-loading">Loading comments...</div>' : '<div class="issues-placeholder">No comments yet</div>'}
            </div>
        `;

        // Fetch comments if there are any
        if (issue.comments > 0) {
            fetchIssueComments(issue.number);
        }
    }

    async function fetchIssueComments(issueNumber) {
        const token = tokenInput.value.trim();
        const repoFull = repoNameInput.value;
        const commentsList = document.getElementById('issue-comments-list');

        try {
            const response = await fetch(
                `https://api.github.com/repos/${repoFull}/issues/${issueNumber}/comments`,
                {
                    headers: {
                        'Authorization': `token ${token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );

            if (response.ok) {
                const comments = await response.json();
                renderComments(comments, commentsList);
            } else {
                commentsList.innerHTML = '<div class="issues-placeholder">Failed to load comments</div>';
            }
        } catch (error) {
            commentsList.innerHTML = '<div class="issues-placeholder">Error loading comments</div>';
        }
    }

    function renderComments(comments, container) {
        if (comments.length === 0) {
            container.innerHTML = '<div class="issues-placeholder">No comments yet</div>';
            return;
        }

        container.innerHTML = '';
        comments.forEach(comment => {
            const timeAgo = getTimeAgo(new Date(comment.created_at));
            const bodyHtml = escapeHtml(comment.body).replace(/\n/g, '<br>');
            
            const commentEl = document.createElement('div');
            commentEl.className = 'issue-comment';
            commentEl.innerHTML = `
                <div class="issue-comment-header">
                    <img src="${comment.user.avatar_url}" class="issue-detail-avatar" />
                    <strong>${comment.user.login}</strong>
                    <span class="issue-comment-time">${timeAgo}</span>
                </div>
                <div class="issue-comment-body">${bodyHtml}</div>
            `;
            container.appendChild(commentEl);
        });
    }

    closeIssueDetailBtn.addEventListener('click', closeIssueDetail);

    // Submit comment
    submitCommentBtn.addEventListener('click', async () => {
        if (!currentOpenIssue) return;
        const commentBody = newCommentInput.value.trim();
        if (!commentBody) {
            alert('Please enter a comment.');
            return;
        }
        await postComment(currentOpenIssue.number, commentBody);
    });

    // Close issue with comment
    closeIssueBtn.addEventListener('click', async () => {
        if (!currentOpenIssue) return;
        // Show a nicer inline confirmation instead of browser confirm()
        closeConfirm.style.display = 'flex';
    });

    cancelCloseBtn.addEventListener('click', () => {
        closeConfirm.style.display = 'none';
    });

    confirmCloseBtn.addEventListener('click', async () => {
        if (!currentOpenIssue) return;
        const commentBody = newCommentInput.value.trim();
        await closeIssueWithComment(currentOpenIssue.number, commentBody);
    });

    async function postComment(issueNumber, body) {
        const token = tokenInput.value.trim();
        const repoFull = repoNameInput.value;
        submitCommentBtn.disabled = true;
        submitCommentBtn.textContent = 'Posting...';

        try {
            const response = await fetch(
                `https://api.github.com/repos/${repoFull}/issues/${issueNumber}/comments`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `token ${token}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ body })
                }
            );

            if (response.ok) {
                newCommentInput.value = '';
                // Refresh comments
                fetchIssueComments(issueNumber);
                // Update comment count in current issue
                if (currentOpenIssue) currentOpenIssue.comments++;
            } else {
                const error = await response.json();
                alert('Failed to post comment: ' + error.message);
            }
        } catch (error) {
            alert('Network error: ' + error.message);
        } finally {
            submitCommentBtn.disabled = false;
            submitCommentBtn.textContent = 'Comment';
        }
    }

    async function closeIssueWithComment(issueNumber, commentBody) {
        const token = tokenInput.value.trim();
        const repoFull = repoNameInput.value;
        closeIssueBtn.disabled = true;
        confirmCloseBtn.disabled = true;
        cancelCloseBtn.disabled = true;
        confirmCloseBtn.textContent = 'Closing...';

        try {
            // Post comment first if there is one
            if (commentBody) {
                await fetch(
                    `https://api.github.com/repos/${repoFull}/issues/${issueNumber}/comments`,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `token ${token}`,
                            'Accept': 'application/vnd.github.v3+json',
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ body: commentBody })
                    }
                );
            }

            // Close the issue
            const response = await fetch(
                `https://api.github.com/repos/${repoFull}/issues/${issueNumber}`,
                {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `token ${token}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ state: 'closed' })
                }
            );

            if (response.ok) {
                newCommentInput.value = '';
                closeConfirm.style.display = 'none';
                closeIssueDetail();
                
                // Optimistic update: update both master cache and filtered view
                const cachedIssue = masterIssuesCache.find(i => i.number === issueNumber);
                if (cachedIssue) {
                    cachedIssue.state = 'closed';
                }
                // If viewing only open issues, remove from filtered list
                if (issuesStateFilter.value === 'open') {
                    allFetchedIssues = allFetchedIssues.filter(i => i.number !== issueNumber);
                } else {
                    const filteredIssue = allFetchedIssues.find(i => i.number === issueNumber);
                    if (filteredIssue) {
                        filteredIssue.state = 'closed';
                    }
                }
                renderIssuesList();
            } else {
                const error = await response.json();
                alert('Failed to close issue: ' + error.message);
            }
        } catch (error) {
            alert('Network error: ' + error.message);
        } finally {
            closeIssueBtn.disabled = false;
            confirmCloseBtn.disabled = false;
            cancelCloseBtn.disabled = false;
            confirmCloseBtn.textContent = 'Close';
        }
    }
    // ---------------------------------

    // Issues event listeners
    issuesStateFilter.addEventListener('change', () => {
        // Try client-side filtering first, only fetch if no cache
        if (masterIssuesCache.length > 0) {
            allFetchedIssues = filterIssuesFromCache(issuesStateFilter.value);
            renderIssuesList();
        } else {
            fetchIssues(true);
        }
    });
    refreshIssuesBtn.addEventListener('click', () => fetchIssues(true, true)); // Force refresh from API
    loadMoreIssuesBtn.addEventListener('click', () => {
        issuesPage++;
        fetchIssues(false, true);
    });
    // ----------------------------

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
        if (!imageRepoSelectTrigger.contains(e.target) && !imageRepoSelectDropdown.contains(e.target)) {
            imageRepoSelectDropdown.style.display = 'none';
            imageRepoSelectTrigger.classList.remove('is-open');
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
            
            // Clear previous selections and caches when changing repo
            selectedAssignees.clear();
            updateAssigneeText();
            masterIssuesCache = [];
            allFetchedIssues = [];
            lastFetchedState = null;
            
            fetchLabels(tokenInput.value.trim(), owner, repo);
            fetchAssignees(tokenInput.value.trim(), owner, repo);
            
            // Refresh issues if in issues view
            if (issuesView.style.display !== 'none') {
                fetchIssues(true, true);
            }
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
    chrome.storage.sync.get(['githubToken', 'githubOwner', 'githubRepoName', 'githubAssignees', 'darkMode', 'advancedOptionsOpen', 'imageToken', 'imageRepo'], (items) => {
        if (items.githubToken) tokenInput.value = items.githubToken;
        if (items.githubOwner) ownerInput.value = items.githubOwner;
        if (items.imageToken) imageTokenInput.value = items.imageToken;
        if (items.imageRepo) {
            imageRepoInput.value = items.imageRepo;
            // Update select text
            if (items.imageRepo.includes('/')) {
                const [, repoName] = items.imageRepo.split('/');
                imageRepoSelectText.textContent = repoName;
            } else {
                imageRepoSelectText.textContent = items.imageRepo;
            }
        }
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

        // Auto-load repos if token is present
        if (items.githubToken) {
            fetchRepositories(items.githubToken, items.githubOwner);
        }

        // Auto-refresh issues when opening the extension (only if Issues tab is active)
        if (restoredActiveTab === 'issues' && items.githubToken && repoNameInput.value) {
            fetchIssues(true);
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

    // Save Settings Function
    function saveSettings(btn) {
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Saving...';

        const token = tokenInput.value.trim();
        const owner = ownerInput.value.trim();
        const repoFull = repoNameInput.value;
        const assigneesRaw = assigneesInput.value;
        const imageToken = imageTokenInput.value.trim();
        const imageRepo = imageRepoInput.value.trim();

        chrome.storage.sync.set({
            githubToken: token,
            githubOwner: owner,
            githubRepoName: repoFull,
            githubAssignees: assigneesRaw,
            imageToken: imageToken,
            imageRepo: imageRepo
        }, () => {
            if (repoFull) {
                const [rOwner, rName] = repoFull.split('/');
                updateRepoDisplay(rOwner, rName);
                fetchLabels(token, rOwner, rName);
            }
            showStatus('Settings saved!', 'success');
            
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.disabled = false;
                statusDiv.innerHTML = '';
            }, 1000);
        });
    }

    // Save Settings Button Listeners
    saveSettingsBtn.addEventListener('click', () => saveSettings(saveSettingsBtn));
    saveImageSettingsBtn.addEventListener('click', () => saveSettings(saveImageSettingsBtn));

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
        const mainToken = tokenInput.value.trim();
        const imageToken = imageTokenInput.value.trim();
        const imageRepo = imageRepoInput.value.trim();
        
        // Use image-specific token if provided, otherwise fall back to main token
        const token = imageToken || mainToken;
        // Use image repo if provided, otherwise fall back to main repo
        const repoFull = imageRepo || repoNameInput.value;

        if (!token || !repoFull) {
            showStatus('Please configure Token and Image Repo in Settings first.', 'error');
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
                saveDraft(); // Clear draft in storage
                
                // Optimistic update: add the new issue to master cache and filtered view
                masterIssuesCache.unshift(data);
                if (issuesStateFilter.value === 'open' || issuesStateFilter.value === 'all') {
                    allFetchedIssues.unshift(data);
                }
                if (issuesView.style.display !== 'none') {
                    renderIssuesList();
                }
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
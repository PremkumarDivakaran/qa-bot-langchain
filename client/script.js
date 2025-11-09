// Global functions for support page
function copyEmailAddress() {
    const email = 'premkumardivakaran10@gmail.com';
    
    // Find the button element (since event.target is not available)
    const button = document.querySelector('button[onclick="copyEmailAddress()"]');
    
    // Check if clipboard API is available
    if (navigator.clipboard && window.isSecureContext) {
        // Modern clipboard API
        navigator.clipboard.writeText(email).then(() => {
            showCopySuccess(button);
        }).catch(err => {
            console.error('Clipboard API failed: ', err);
            fallbackCopy(email, button);
        });
    } else {
        // Fallback for older browsers or non-secure contexts
        console.log('Clipboard API not available, using fallback method');
        fallbackCopy(email, button);
    }
}

function showCopySuccess(button) {
    if (button) {
        const originalHtml = button.innerHTML;
        const originalStyle = button.style.background;
        
        button.innerHTML = '<i class="fas fa-check"></i> Copied!';
        button.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        button.style.color = 'white';
        
        setTimeout(() => {
            button.innerHTML = originalHtml;
            button.style.background = originalStyle;
            button.style.color = '#3b82f6';
        }, 2000);
    }
}

function showCopyError(button, email) {
    if (button) {
        const originalHtml = button.innerHTML;
        const originalStyle = button.style.background;
        
        button.innerHTML = '<i class="fas fa-times"></i> Failed';
        button.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
        button.style.color = 'white';
        
        setTimeout(() => {
            button.innerHTML = originalHtml;
            button.style.background = originalStyle;
            button.style.color = '#3b82f6';
        }, 3000);
    }
    
    // Show user-friendly message
    setTimeout(() => {
        alert('Copy failed. Please manually copy this email address:\n\n' + email);
    }, 100);
}

function fallbackCopy(email, button) {
    try {
        // Create a temporary textarea element
        const textArea = document.createElement('textarea');
        textArea.value = email;
        
        // Style to be invisible
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        textArea.style.opacity = '0';
        textArea.setAttribute('readonly', '');
        
        document.body.appendChild(textArea);
        
        // Select and copy
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
            console.log('Fallback copy successful');
            showCopySuccess(button);
        } else {
            throw new Error('execCommand failed');
        }
        
    } catch (fallbackErr) {
        console.error('All copy methods failed: ', fallbackErr);
        showCopyError(button, email);
    }
}

// Function for copying to clipboard with feedback
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        console.log('Text copied to clipboard');
    }).catch(err => {
        console.error('Failed to copy text: ', err);
    });
}

class QABotClient {
    constructor() {
        try {
            console.log('Initializing QA Bot Client...');
            this.apiBaseUrl = 'http://localhost:8787';
            this.currentTab = 'ingestion';
            this.currentView = 'dashboard';
            this.initializeElements();
            this.setupEventListeners();
            this.setupSidebarNavigation();
            this.initializeHybridControls();
            this.checkServerStatus();
            this.progressTimer = null;
            this.startTime = null;
            console.log('QA Bot Client initialized successfully');
        } catch (error) {
            console.error('Error initializing QA Bot Client:', error);
            this.showInitializationError(error);
        }
    }

    initializeElements() {
        try {
            console.log('Initializing DOM elements...');
            // Tab elements
            this.tabButtons = document.querySelectorAll('.tab-btn');
            this.tabPanels = document.querySelectorAll('.tab-panel');

            // Status elements
            this.statusCard = document.getElementById('statusCard');
            this.statusIcon = document.getElementById('statusIcon');
            this.statusTitle = document.getElementById('statusTitle');
            this.statusMessage = document.getElementById('statusMessage');

            // Upload form elements
            this.uploadForm = document.getElementById('uploadForm');
            this.fileInput = document.getElementById('fileInput');
            this.dropZone = document.getElementById('dropZone');
            this.filePreview = document.getElementById('filePreview');
            this.fileName = document.getElementById('fileName');
            this.fileSize = document.getElementById('fileSize');
            this.removeFileBtn = document.getElementById('removeFile');
            this.clearExistingCheckbox = document.getElementById('clearExisting');
            this.uploadBtn = document.getElementById('uploadBtn');

            // Progress elements
            this.progressSection = document.getElementById('progressSection');
            this.progressFill = document.getElementById('progressFill');
            this.progressStatus = document.getElementById('progressStatus');
            this.progressTime = document.getElementById('progressTime');

            // Results elements
            this.resultsSection = document.getElementById('resultsSection');
            this.resultIcon = document.getElementById('resultIcon');
            this.resultTitle = document.getElementById('resultTitle');
            this.resultsContent = document.getElementById('resultsContent');
            this.uploadAnotherBtn = document.getElementById('uploadAnotherBtn');
            this.viewDataBtn = document.getElementById('viewDataBtn');

            // Retrieval elements
            this.retrievalForm = document.getElementById('retrievalForm');
            this.userStoryInput = document.getElementById('userStoryInput');
            this.relevantStoriesLimit = document.getElementById('relevantStoriesLimit');
            this.searchMode = document.getElementById('searchMode');
            this.hybridControls = document.getElementById('hybridControls');
            this.searchBalance = document.getElementById('searchBalance');
            this.vectorWeight = document.getElementById('vectorWeight');
            this.bm25Weight = document.getElementById('bm25Weight');
            this.retrieveBtn = document.getElementById('retrieveBtn');

            // Retrieval progress elements
            this.retrievalProgressSection = document.getElementById('retrievalProgressSection');
            this.retrievalProgressFill = document.getElementById('retrievalProgressFill');
            this.retrievalProgressStatus = document.getElementById('retrievalProgressStatus');
            this.retrievalProgressTime = document.getElementById('retrievalProgressTime');

            // Retrieval results elements
            this.retrievalResultsSection = document.getElementById('retrievalResultsSection');
            this.qualityScore = document.getElementById('qualityScore');
            this.scoreValue = document.getElementById('scoreValue');
            this.storyContent = document.getElementById('storyContent');
            this.resultCount = document.getElementById('resultCount');
            this.storiesTableBody = document.getElementById('storiesTableBody');
            this.generateAnotherBtn = document.getElementById('generateAnotherBtn');
            this.exportStoryBtn = document.getElementById('exportStoryBtn');

            // Loading overlay
            this.loadingOverlay = document.getElementById('loadingOverlay');
            
            console.log('DOM elements initialized successfully');
        } catch (error) {
            console.error('Error initializing DOM elements:', error);
            throw error;
        }
    }

    setupEventListeners() {
        try {
            console.log('Setting up event listeners...');
            // Tab switching
            this.tabButtons.forEach(button => {
                button.addEventListener('click', (e) => this.switchTab(e.target.closest('.tab-btn').dataset.tab));
            });

            // Retrieval form
            if (this.retrievalForm) {
                this.retrievalForm.addEventListener('submit', (e) => this.handleRetrievalSubmit(e));
            }

            // Hybrid search controls
            if (this.searchMode) {
                this.searchMode.addEventListener('change', (e) => this.handleSearchModeChange(e));
            }
            
            if (this.searchBalance) {
                this.searchBalance.addEventListener('input', (e) => this.handleSearchBalanceChange(e));
            }

            // Retrieval action buttons
            if (this.generateAnotherBtn) {
                this.generateAnotherBtn.addEventListener('click', () => this.resetRetrievalForm());
            }
            
            if (this.exportStoryBtn) {
                this.exportStoryBtn.addEventListener('click', () => this.exportGeneratedStory());
            }

        // File input and drop zone
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        // Drop zone click handler - only trigger if not clicking on browse link
        this.dropZone.addEventListener('click', (e) => {
            // Don't trigger if clicking on browse link or file input itself
            if (!e.target.classList.contains('browse-link') && e.target !== this.fileInput) {
                this.fileInput.click();
            }
        });
        
        this.dropZone.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.dropZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.dropZone.addEventListener('drop', (e) => this.handleDrop(e));

        // Remove file button
        this.removeFileBtn.addEventListener('click', () => this.clearFileSelection());

        // Form submission
        this.uploadForm.addEventListener('submit', (e) => this.handleFormSubmit(e));

        // Action buttons
        this.uploadAnotherBtn.addEventListener('click', () => this.resetForm());
        this.viewDataBtn.addEventListener('click', () => this.viewProcessedData());

            // Browse link - separate handler to prevent conflicts
            const browseLink = document.querySelector('.browse-link');
            if (browseLink) {
                browseLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.fileInput.click();
                });
            }
            
            console.log('Event listeners set up successfully');
        } catch (error) {
            console.error('Error setting up event listeners:', error);
            throw error;
        }
    }

    setupSidebarNavigation() {
        try {
            console.log('Setting up sidebar navigation...');
            
            // Setup sidebar navigation links
            const navLinks = document.querySelectorAll('.nav-link');
            navLinks.forEach(link => {
                // Skip external links (like support.html) that should work normally
                const href = link.getAttribute('href');
                if (href && (href.includes('.html') || href.startsWith('mailto:') || href.startsWith('http'))) {
                    return; // Let external links work normally without preventDefault
                }
                
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const view = link.getAttribute('data-view');
                    if (view) {
                        this.switchView(view);
                    }
                });
            });
            
            console.log('Sidebar navigation set up successfully');
        } catch (error) {
            console.error('Error setting up sidebar navigation:', error);
            throw error;
        }
    }

    switchView(viewName) {
        try {
            console.log(`Switching to view: ${viewName}`);
            
            // Update current view
            this.currentView = viewName;
            
            // Hide all views
            const allViews = document.querySelectorAll('.content-view');
            allViews.forEach(view => view.classList.remove('active'));
            
            // Show selected view
            const targetView = document.getElementById(`${viewName}-view`);
            if (targetView) {
                targetView.classList.add('active');
            }
            
            // Update navigation active state
            const allNavLinks = document.querySelectorAll('.nav-link');
            allNavLinks.forEach(link => link.classList.remove('active'));
            
            const activeNavLink = document.querySelector(`[data-view="${viewName}"]`);
            if (activeNavLink) {
                activeNavLink.classList.add('active');
            }
            
            // Handle view-specific logic
            if (viewName === 'user-story-retrieval') {
                // Reset to ingestion tab when entering user story retrieval
                this.switchTab('ingestion');
            }
            
            console.log(`Successfully switched to view: ${viewName}`);
        } catch (error) {
            console.error(`Error switching to view ${viewName}:`, error);
        }
    }

    async checkServerStatus() {
        try {
            this.updateStatus('checking', 'Checking server...', 'Connecting to backend services');
            
            const response = await fetch(`${this.apiBaseUrl}/health`, {
                method: 'GET',
                timeout: 5000
            });

            if (response.ok) {
                const data = await response.json();
                this.updateStatus('online', 'Server Online', `Connected to ${data.service || 'QA Bot API'}`);
            } else {
                throw new Error('Server responded with error');
            }
        } catch (error) {
            console.error('Server status check failed:', error);
            this.updateStatus('offline', 'Server Offline', 'Unable to connect to backend services');
        }
    }

    updateStatus(status, title, message) {
        this.statusIcon.className = `fas fa-circle ${status}`;
        this.statusTitle.textContent = title;
        this.statusMessage.textContent = message;
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            this.displayFilePreview(file);
        }
    }

    handleDragOver(event) {
        event.preventDefault();
        this.dropZone.classList.add('drag-over');
    }

    handleDragLeave(event) {
        event.preventDefault();
        this.dropZone.classList.remove('drag-over');
    }

    handleDrop(event) {
        event.preventDefault();
        this.dropZone.classList.remove('drag-over');
        
        const files = event.dataTransfer.files;
        if (files.length > 0) {
            this.fileInput.files = files;
            this.displayFilePreview(files[0]);
        }
    }

    displayFilePreview(file) {
        // Validate file type
        const allowedTypes = ['.csv', '.txt'];
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        
        if (!allowedTypes.includes(fileExtension)) {
            this.showNotification('Please select a CSV or TXT file', 'error');
            this.clearFileSelection();
            return;
        }

        // Display file info
        this.fileName.textContent = file.name;
        this.fileSize.textContent = this.formatFileSize(file.size);
        this.filePreview.style.display = 'block';
        this.enableUploadButton();

        // Hide the drop zone content
        const dropZoneContent = this.dropZone.querySelector('.drop-zone-content');
        if (dropZoneContent) {
            dropZoneContent.style.display = 'none';
        }
    }

    clearFileSelection() {
        this.fileInput.value = '';
        this.filePreview.style.display = 'none';
        this.resetUploadButton();

        // Show the drop zone content again
        const dropZoneContent = this.dropZone.querySelector('.drop-zone-content');
        if (dropZoneContent) {
            dropZoneContent.style.display = 'block';
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    disableUploadButton() {
        this.uploadBtn.disabled = true;
        this.uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Processing...</span>';
        this.uploadBtn.classList.add('processing');
    }

    enableUploadButton() {
        this.uploadBtn.disabled = false;
        this.uploadBtn.innerHTML = '<i class="fas fa-upload"></i><span>Upload & Process</span>';
        this.uploadBtn.classList.remove('processing');
    }

    resetUploadButton() {
        this.uploadBtn.disabled = true;
        this.uploadBtn.innerHTML = '<i class="fas fa-upload"></i><span>Upload & Process</span>';
        this.uploadBtn.classList.remove('processing');
    }

    disableRetrievalButton() {
        console.log('Disabling retrieval button - setting processing state');
        this.retrieveBtn.disabled = true;
        this.retrieveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Processing...</span>';
        this.retrieveBtn.classList.add('processing');
    }

    enableRetrievalButton() {
        console.log('Enabling retrieval button - removing processing state');
        this.retrieveBtn.disabled = false;
        this.retrieveBtn.innerHTML = '<i class="fas fa-magic"></i><span>Generate Standardized User Story</span>';
        this.retrieveBtn.classList.remove('processing');
    }

    async handleFormSubmit(event) {
        event.preventDefault();
        
        const file = this.fileInput.files[0];
        if (!file) {
            this.showNotification('Please select a file', 'error');
            return;
        }

        // Disable button to prevent multiple submissions
        this.disableUploadButton();

        try {
            this.showProgress();
            this.startProgressTimer();
            
            const formData = new FormData();
            formData.append('file', file);
            formData.append('clearExisting', this.clearExistingCheckbox.checked.toString());

            // Debug logging
            console.log('Upload parameters:', {
                fileName: file.name,
                clearExisting: this.clearExistingCheckbox.checked,
                clearExistingValue: formData.get('clearExisting')
            });

            this.updateProgress(10, 'Uploading file...');

            const response = await fetch(`${this.apiBaseUrl}/ingest/user-stories`, {
                method: 'POST',
                body: formData,
                onUploadProgress: (progressEvent) => {
                    const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    this.updateProgress(Math.min(progress, 30), 'Uploading file...');
                }
            });

            this.updateProgress(40, 'Processing user stories...');

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }

            this.updateProgress(80, 'Generating embeddings...');

            const result = await response.json();
            
            this.updateProgress(100, 'Complete!');
            
            setTimeout(() => {
                this.showResults(result, true);
            }, 500);

        } catch (error) {
            console.error('Upload failed:', error);
            this.showResults({ error: error.message }, false);
        } finally {
            this.stopProgressTimer();
            // Re-enable button after processing completes
            this.enableUploadButton();
        }
    }

    showProgress() {
        this.progressSection.style.display = 'block';
        this.resultsSection.style.display = 'none';
        this.progressFill.style.width = '0%';
    }

    updateProgress(percentage, status) {
        this.progressFill.style.width = `${percentage}%`;
        this.progressStatus.textContent = status;
    }

    startProgressTimer() {
        this.startTime = Date.now();
        this.progressTimer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            this.progressTime.textContent = `${elapsed}s`;
        }, 1000);
    }

    stopProgressTimer() {
        if (this.progressTimer) {
            clearInterval(this.progressTimer);
            this.progressTimer = null;
        }
    }

    showResults(result, success) {
        this.progressSection.style.display = 'none';
        this.resultsSection.style.display = 'block';

        if (success) {
            this.resultIcon.className = 'result-icon success';
            this.resultIcon.innerHTML = '<i class="fas fa-check-circle"></i>';
            this.resultTitle.textContent = 'Upload Complete!';
            
            this.resultsContent.innerHTML = this.generateSuccessContent(result);
        } else {
            this.resultIcon.className = 'result-icon error';
            this.resultIcon.innerHTML = '<i class="fas fa-exclamation-circle"></i>';
            this.resultTitle.textContent = 'Upload Failed';
            
            this.resultsContent.innerHTML = this.generateErrorContent(result);
        }
    }

    generateSuccessContent(result) {
        const stats = [
            { label: 'Stories Processed', value: result.processed || '0' },
            { label: 'New Stories Added', value: result.added || '0' },
            { label: 'Duplicates Skipped', value: result.duplicates || '0' },
            { label: 'Processing Time', value: result.processingTime || 'N/A' }
        ];

        const statsHtml = stats.map(stat => `
            <div class="stat-item">
                <span class="stat-label">${stat.label}</span>
                <span class="stat-value">${stat.value}</span>
            </div>
        `).join('');

        return `
            <div class="result-stats">
                ${statsHtml}
            </div>
            <div class="result-message">
                <p><strong>Success!</strong> Your user stories have been processed and added to the knowledge base.</p>
                ${result.message ? `<p>${result.message}</p>` : ''}
            </div>
        `;
    }

    generateErrorContent(result) {
        return `
            <div class="result-message error-message">
                <p><strong>Error:</strong> ${result.error || 'An unknown error occurred'}</p>
                <p>Please check your file format and try again. Supported formats: CSV, TXT</p>
            </div>
        `;
    }

    resetForm() {
        try {
            this.clearFileSelection();
            if (this.clearExistingCheckbox) this.clearExistingCheckbox.checked = false;
            if (this.progressSection) this.progressSection.style.display = 'none';
            if (this.resultsSection) this.resultsSection.style.display = 'none';
        } catch (error) {
            console.error('Error resetting upload form:', error);
        }
    }

    viewProcessedData() {
        console.log('viewProcessedData called');
        try {
            this.showProcessedDataModal();
        } catch (error) {
            console.error('Error in viewProcessedData:', error);
            alert('An error occurred while trying to show processed data: ' + error.message);
        }
    }

    async showProcessedDataModal() {
        try {
            console.log('Starting to fetch processed data...');
            
            // Create and show loading overlay
            this.showLoadingOverlay('Loading processed data...');

            // Fetch data from admin endpoint
            const response = await fetch(`${this.apiBaseUrl}/admin/data?limit=100`);
            
            console.log('Response received:', response.status);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch data: ${response.status}`);
            }

            const data = await response.json();
            
            console.log('Data fetched successfully:', data);
            
            // Hide loading overlay
            this.hideLoadingOverlay();

            // Create and show the modal
            this.createDataViewModal(data);

        } catch (error) {
            console.error('Error in showProcessedDataModal:', error);
            this.hideLoadingOverlay();
            console.error('Error fetching processed data:', error);
            
            // Show error modal
            this.createErrorModal('Failed to load processed data', error.message);
        }
    }

    createDataViewModal(data) {
        try {
            console.log('Creating data view modal with data:', data);
            
            // Remove existing modal if any
            const existingModal = document.getElementById('dataModal');
            if (existingModal) {
                existingModal.remove();
            }

            const userStories = data.data?.userStories || [];
            const pagination = data.data?.pagination || { total: 0 };

            console.log(`Found ${userStories.length} user stories to display`);

            // Create modal HTML
            const modalHTML = `
                <div id="dataModal" class="data-modal-overlay">
                    <div class="data-modal">
                        <div class="data-modal-header">
                            <h2><i class="fas fa-database"></i> Processed User Stories Data</h2>
                            <button class="data-modal-close" onclick="this.closest('.data-modal-overlay').remove()">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <div class="data-modal-body">
                            <!-- Stats -->
                            <div class="data-stats">
                                <div class="stat-card">
                                    <div class="stat-number">${pagination.total || 0}</div>
                                    <div class="stat-label">Total Stories</div>
                                </div>
                                <div class="stat-card">
                                    <div class="stat-number">${userStories.filter(s => s.priority === 'high').length}</div>
                                    <div class="stat-label">High Priority</div>
                                </div>
                                <div class="stat-card">
                                    <div class="stat-number">${userStories.filter(s => s.priority === 'medium').length}</div>
                                    <div class="stat-label">Medium Priority</div>
                                </div>
                                <div class="stat-card">
                                    <div class="stat-number">${userStories.filter(s => s.priority === 'critical').length}</div>
                                    <div class="stat-label">Critical Priority</div>
                                </div>
                            </div>

                            ${userStories.length > 0 ? `
                            <!-- Data Table -->
                            <div class="data-table-container">
                                <table class="data-table">
                                    <thead>
                                        <tr>
                                            <th>Story ID</th>
                                            <th>Title</th>
                                            <th>Description</th>
                                            <th>Priority</th>
                                            <th>Category</th>
                                            <th>Score</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${userStories.map(story => `
                                        <tr>
                                            <td><span class="story-id">${this.escapeHtml(story.storyId || 'N/A')}</span></td>
                                            <td>${this.escapeHtml(story.title || 'No title')}</td>
                                            <td class="description" title="${this.escapeHtml(story.description || 'No description')}">${this.truncateText(story.description || 'No description', 100)}</td>
                                            <td><span class="priority-badge priority-${(story.priority || 'medium').toLowerCase()}">${this.escapeHtml(story.priority || 'Medium')}</span></td>
                                            <td>${this.escapeHtml(story.category || 'General')}</td>
                                            <td><span class="score-badge">${(story.score || 0).toFixed(2)}</span></td>
                                        </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                            ` : `
                            <div class="no-data">
                                <i class="fas fa-inbox"></i>
                                <h3>No User Stories Found</h3>
                                <p>No processed user stories are available in the database.</p>
                                <p>Upload some CSV or TXT files to see data here.</p>
                            </div>
                            `}
                        </div>

                        <div class="data-modal-footer">
                            <button class="btn-secondary" onclick="location.reload()">
                                <i class="fas fa-sync-alt"></i>
                                Refresh
                            </button>
                            <button class="btn-primary" onclick="this.closest('.data-modal-overlay').remove()">
                                <i class="fas fa-check"></i>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            `;

            // Add modal to DOM
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            
            console.log('Modal added to DOM');

            // Add click outside to close
            const modal = document.getElementById('dataModal');
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });

            // Add escape key to close
            const escapeHandler = (e) => {
                if (e.key === 'Escape') {
                    modal.remove();
                    document.removeEventListener('keydown', escapeHandler);
                }
            };
            document.addEventListener('keydown', escapeHandler);
            
            console.log('Modal event listeners added');
            
        } catch (error) {
            console.error('Error creating data view modal:', error);
            this.createErrorModal('Modal Creation Error', `Failed to create the data view: ${error.message}`);
        }
    }

    // Loading overlay methods
    showLoadingOverlay(message = 'Loading...') {
        console.log('Showing loading overlay with message:', message);
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            const messageElement = overlay.querySelector('p');
            if (messageElement) {
                messageElement.textContent = message;
            }
            overlay.style.display = 'flex';
        } else {
            console.error('Loading overlay element not found');
        }
    }

    hideLoadingOverlay() {
        console.log('Hiding loading overlay');
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        } else {
            console.error('Loading overlay element not found when trying to hide');
        }
    }

    // Helper function to escape HTML
    escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.toString().replace(/[&<>"']/g, (m) => map[m]);
    }

    // Helper function to truncate text
    truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return this.escapeHtml(text);
        return this.escapeHtml(text.substring(0, maxLength)) + '...';
    }

    createErrorModal(title, message) {
        // Remove existing modal if any
        const existingModal = document.getElementById('errorModal');
        if (existingModal) {
            existingModal.remove();
        }

        const modalHTML = `
            <div id="errorModal" class="data-modal-overlay">
                <div class="data-modal error-modal">
                    <div class="data-modal-header">
                        <h2><i class="fas fa-exclamation-triangle"></i> ${title}</h2>
                        <button class="data-modal-close" onclick="this.closest('.data-modal-overlay').remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="data-modal-body">
                        <div class="error-content">
                            <p>${message}</p>
                            <div class="error-suggestion">
                                <p><strong>Suggestions:</strong></p>
                                <ul>
                                    <li>Make sure the server is running</li>
                                    <li>Check if any user stories have been uploaded</li>
                                    <li>Try refreshing the page</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div class="data-modal-footer">
                        <button class="btn-primary" onclick="this.closest('.data-modal-overlay').remove()">
                            <i class="fas fa-check"></i>
                            OK
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    // Tab Management
    switchTab(tabName) {
        try {
            // Update active tab button
            this.tabButtons.forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.tab === tabName) {
                    btn.classList.add('active');
                }
            });

            // Update active tab panel
            this.tabPanels.forEach(panel => {
                panel.classList.remove('active');
                if (panel.id === `${tabName}-panel`) {
                    panel.classList.add('active');
                }
            });

            this.currentTab = tabName;
            
            // Reset forms when switching tabs with safety checks
            if (tabName === 'retrieval') {
                if (typeof this.resetRetrievalForm === 'function') {
                    this.resetRetrievalForm();
                }
            } else if (tabName === 'ingestion') {
                if (typeof this.resetForm === 'function') {
                    this.resetForm();
                }
            }
        } catch (error) {
            console.error('Error switching tabs:', error);
            // Don't show notification here as it might cause additional errors
        }
    }

    // Retrieval Functionality
    async handleRetrievalSubmit(event) {
        event.preventDefault();
        
        const userInput = this.userStoryInput.value.trim();
        const limit = parseInt(this.relevantStoriesLimit.value);
        const searchMode = this.searchMode.value;
        const vectorWeight = parseInt(this.searchBalance.value) / 100;
        const bm25Weight = 1 - vectorWeight;

        if (!userInput) {
            this.showNotification('Please enter a user story', 'error');
            return;
        }

        // Disable button to prevent multiple submissions
        console.log('Starting retrieval process - disabling button');
        this.disableRetrievalButton();
        this.startRetrievalProgress();

        try {
            const requestBody = {
                userInput: userInput,
                relevantStoriesLimit: limit,
                searchMode: searchMode,
                vectorWeight: searchMode === 'hybrid' ? vectorWeight : (searchMode === 'vector' ? 1.0 : 0.0),
                bm25Weight: searchMode === 'hybrid' ? bm25Weight : (searchMode === 'bm25' ? 1.0 : 0.0)
            };

            const response = await fetch(`${this.apiBaseUrl}/retrieve/user-stories`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Retrieval failed');
            }

            const result = await response.json();
            this.showRetrievalResults(result);

        } catch (error) {
            console.error('Retrieval error:', error);
            this.showNotification(`Error: ${error.message}`, 'error');
            this.hideRetrievalProgress();
        }
    }

    startRetrievalProgress() {
        this.retrievalProgressSection.style.display = 'block';
        this.retrievalResultsSection.style.display = 'none';
        
        this.startTime = Date.now();
        this.progressTimer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            this.retrievalProgressTime.textContent = `${elapsed}s`;
            
            // Animate progress bar (indeterminate)
            const progress = (elapsed % 4) * 25;
            this.retrievalProgressFill.style.width = `${Math.min(progress, 90)}%`;
        }, 100);

        // Update status messages periodically
        setTimeout(() => {
            if (this.progressTimer) {
                this.retrievalProgressStatus.textContent = 'Generating embeddings...';
            }
        }, 2000);

        setTimeout(() => {
            if (this.progressTimer) {
                this.retrievalProgressStatus.textContent = 'Processing with LLM...';
            }
        }, 8000);
    }

    hideRetrievalProgress() {
        try {
            if (this.retrievalProgressSection) this.retrievalProgressSection.style.display = 'none';
            if (this.retrieveBtn) this.enableRetrievalButton();
            
            if (this.progressTimer) {
                clearInterval(this.progressTimer);
                this.progressTimer = null;
            }
        } catch (error) {
            console.error('Error hiding retrieval progress:', error);
        }
    }

    showRetrievalResults(result) {
        this.hideRetrievalProgress();
        
        // Show results section
        this.retrievalResultsSection.style.display = 'block';

        // Update quality score
        this.scoreValue.textContent = `${result.score}/100`;
        this.scoreValue.style.color = result.score >= 80 ? '#059669' : result.score >= 60 ? '#d97706' : '#dc2626';

        // Display generated user story
        this.displayGeneratedStory(result.createdUserStory);

        // Display relevant stories table
        this.displayRelevantStories(result.relevantUserStories);

        // Update result count
        this.resultCount.textContent = `Found ${result.relevantUserStories.length} stories`;

        // Store result for export
        this.lastRetrievalResult = result;

        this.showNotification('User story generated successfully!', 'success');
    }

    displayGeneratedStory(story) {
        const storyHtml = `
            <div class="story-field">
                <div class="field-label">
                    <i class="fas fa-id-card"></i>
                    Story ID
                </div>
                <div class="field-value">${story.storyId}</div>
            </div>
            
            <div class="story-field">
                <div class="field-label">
                    <i class="fas fa-heading"></i>
                    Summary
                </div>
                <div class="field-value">${story.summary}</div>
            </div>
            
            <div class="story-field">
                <div class="field-label">
                    <i class="fas fa-project-diagram"></i>
                    Project
                </div>
                <div class="field-value">${story.projectName}</div>
            </div>
            
            <div class="story-field">
                <div class="field-label">
                    <i class="fas fa-align-left"></i>
                    Description
                </div>
                <div class="field-value">${story.description}</div>
            </div>
            
            <div class="story-field">
                <div class="field-label">
                    <i class="fas fa-check-square"></i>
                    Acceptance Criteria
                </div>
                <div class="field-value">${story.acceptanceCriteria}</div>
            </div>
            
            <div class="story-field">
                <div class="field-label">
                    <i class="fas fa-flag"></i>
                    Priority
                </div>
                <div class="field-value">${story.priority}</div>
            </div>
            
            <div class="story-field">
                <div class="field-label">
                    <i class="fas fa-exclamation-triangle"></i>
                    Risk Level
                </div>
                <div class="field-value">${story.risk}</div>
            </div>
        `;
        
        this.storyContent.innerHTML = storyHtml;
    }

    displayRelevantStories(stories) {
        const tableRows = stories.map(story => `
            <tr>
                <td><span class="story-id">${story.storyId}</span></td>
                <td><span class="story-title" title="${story.title}">${story.title}</span></td>
                <td><span class="story-description" title="${story.description}">${story.description}</span></td>
                <td><span class="priority-badge priority-${story.priority.toLowerCase()}">${story.priority}</span></td>
                <td><span class="category-tag">${story.category}</span></td>
                <td><span class="similarity-score">${(story.score * 100).toFixed(1)}%</span></td>
            </tr>
        `).join('');
        
        this.storiesTableBody.innerHTML = tableRows;
    }

    resetRetrievalForm() {
        try {
            if (this.userStoryInput) this.userStoryInput.value = '';
            if (this.relevantStoriesLimit) this.relevantStoriesLimit.value = '5';
            if (this.searchMode) this.searchMode.value = 'hybrid';
            if (this.searchBalance) this.searchBalance.value = '50';
            if (this.retrievalResultsSection) this.retrievalResultsSection.style.display = 'none';
            this.hideRetrievalProgress();
            this.updateSearchWeights();
            this.handleSearchModeChange();
            this.lastRetrievalResult = null;
        } catch (error) {
            console.error('Error resetting retrieval form:', error);
        }
    }

    // Hybrid Search Control Methods
    initializeHybridControls() {
        // Initialize the hybrid controls visibility and values
        this.handleSearchModeChange();
        this.updateSearchWeights();
    }

    handleSearchModeChange() {
        const searchMode = this.searchMode?.value || 'hybrid';
        if (this.hybridControls) {
            this.hybridControls.style.display = searchMode === 'hybrid' ? 'flex' : 'none';
        }
    }

    handleSearchBalanceChange() {
        this.updateSearchWeights();
    }

    updateSearchWeights() {
        const vectorPercentage = parseInt(this.searchBalance?.value || 50);
        const bm25Percentage = 100 - vectorPercentage;
        
        // Convert to decimal values for display
        const vectorDecimal = (vectorPercentage / 100).toFixed(1);
        const bm25Decimal = (bm25Percentage / 100).toFixed(1);
        
        if (this.vectorWeight) {
            this.vectorWeight.textContent = vectorDecimal;
        }
        if (this.bm25Weight) {
            this.bm25Weight.textContent = bm25Decimal;
        }
    }

    exportGeneratedStory() {
        if (!this.lastRetrievalResult) {
            this.showNotification('No data to export', 'error');
            return;
        }

        const dataStr = JSON.stringify(this.lastRetrievalResult, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `user-story-${this.lastRetrievalResult.createdUserStory.storyId}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showNotification('User story exported successfully!', 'success');
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            z-index: 1000;
            box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Remove after 5 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }

    showInitializationError(error) {
        // Create a simple error display if DOM elements aren't available
        const errorDiv = document.createElement('div');
        errorDiv.innerHTML = `
            <div style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: #ef4444;
                color: white;
                padding: 2rem;
                border-radius: 8px;
                box-shadow: 0 10px 25px rgba(0,0,0,0.2);
                z-index: 9999;
                max-width: 500px;
                text-align: center;
            ">
                <h2 style="margin: 0 0 1rem 0;">Initialization Error</h2>
                <p style="margin: 0 0 1rem 0;">Failed to initialize the application:</p>
                <pre style="background: rgba(0,0,0,0.2); padding: 1rem; border-radius: 4px; margin: 1rem 0; font-size: 12px; white-space: pre-wrap;">${error.message}</pre>
                <p style="margin: 0; font-size: 14px;">Please refresh the page or check the console for details.</p>
            </div>
        `;
        document.body.appendChild(errorDiv);
    }

    showLoading(show = true) {
        this.loadingOverlay.style.display = show ? 'flex' : 'none';
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded - Starting QA Bot Client initialization...');
    try {
        window.qaBotClient = new QABotClient();
        console.log('QA Bot Client instance created successfully');
    } catch (error) {
        console.error('Failed to create QA Bot Client instance:', error);
        // Create error display manually since client may not be available
        const errorDiv = document.createElement('div');
        errorDiv.innerHTML = `
            <div style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: #ef4444;
                color: white;
                padding: 2rem;
                border-radius: 8px;
                box-shadow: 0 10px 25px rgba(0,0,0,0.2);
                z-index: 9999;
                max-width: 500px;
                text-align: center;
            ">
                <h2 style="margin: 0 0 1rem 0;">Application Error</h2>
                <p style="margin: 0 0 1rem 0;">Failed to initialize the QA Bot application:</p>
                <pre style="background: rgba(0,0,0,0.2); padding: 1rem; border-radius: 4px; margin: 1rem 0; font-size: 12px; white-space: pre-wrap;">${error.message}</pre>
                <p style="margin: 0; font-size: 14px;">Please refresh the page or check the console for details.</p>
            </div>
        `;
        document.body.appendChild(errorDiv);
    }
});

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    if (window.qaBotClient) {
        window.qaBotClient.showNotification('An unexpected error occurred', 'error');
    }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    if (window.qaBotClient) {
        window.qaBotClient.showNotification('An unexpected error occurred', 'error');
    }
});

// Global function for action cards
function switchView(viewName) {
    if (window.qaBotClient) {
        window.qaBotClient.switchView(viewName);
    }
}

// Global function to copy text to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        // Show success feedback
        const btn = event.target.closest('.copy-btn');
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i>';
        btn.style.background = 'linear-gradient(135deg, #10b981 0%, #34d399 100%)';
        
        // Show temporary success message
        const emailBox = btn.closest('.email-box');
        const successMsg = document.createElement('div');
        successMsg.textContent = 'Email copied to clipboard!';
        successMsg.style.cssText = `
            position: absolute;
            top: -40px;
            left: 50%;
            transform: translateX(-50%);
            background: #10b981;
            color: white;
            padding: 0.5rem 1rem;
            border-radius: 6px;
            font-size: 0.9rem;
            font-weight: 600;
            z-index: 1000;
            animation: fadeInOut 2s ease;
        `;
        
        emailBox.style.position = 'relative';
        emailBox.appendChild(successMsg);
        
        setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.style.background = 'linear-gradient(135deg, #5dade2 0%, #87ceeb 100%)';
            if (successMsg.parentNode) {
                successMsg.parentNode.removeChild(successMsg);
            }
        }, 2000);
    }).catch(() => {
        // Fallback for older browsers
        alert('Email: ' + text);
    });
}

// Add CSS animation for success message
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInOut {
        0% { opacity: 0; transform: translateX(-50%) translateY(10px); }
        20% { opacity: 1; transform: translateX(-50%) translateY(0); }
        80% { opacity: 1; transform: translateX(-50%) translateY(0); }
        100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
    }
`;
document.head.appendChild(style);

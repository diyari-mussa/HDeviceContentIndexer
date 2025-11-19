document.addEventListener("DOMContentLoaded", () => {
    const treeView = document.getElementById("treeView");
    const folderInput = document.getElementById("folderInput");
    const selectAllBtn = document.getElementById("selectAllBtn");
    const deselectAllBtn = document.getElementById("deselectAllBtn");
    const ingestBtn = document.getElementById("ingestBtn");
    const selectedIndexDisplay = document.getElementById('selectedIndexDisplay');
    
    console.log('Elements found:');
    console.log('- treeView:', treeView);
    console.log('- folderInput:', folderInput);
    console.log('- selectAllBtn:', selectAllBtn);
    console.log('- deselectAllBtn:', deselectAllBtn);
    console.log('- ingestBtn:', ingestBtn);
    console.log('- selectedIndexDisplay:', selectedIndexDisplay);
    console.log('selectedIndexDisplay initial text:', selectedIndexDisplay ? selectedIndexDisplay.textContent : 'null');
    
    const selectedFiles = new Set();

    // Helper function to get cookie value
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }

    // Helper function to set cookie
    function setCookie(name, value, days = 365) {
        const maxAge = days * 24 * 60 * 60;
        document.cookie = `${name}=${value}; path=/; max-age=${maxAge}`;
    }

    // Load selected index from cookie immediately
    const cachedIndex = getCookie('selectedIndex');
    if (cachedIndex && selectedIndexDisplay) {
        console.log('Loading selected index from cookie:', cachedIndex);
        selectedIndexDisplay.textContent = cachedIndex;
        selectedIndexDisplay.style.color = '#2563eb';
    }

    // Only include search functionality if elements exist (for main dashboard)
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
        const searchBtn = document.getElementById("searchBtn");
        const searchResults = document.getElementById("searchResults");
        const resultCount = document.getElementById("resultCount");
        const resultsContainer = document.getElementById("resultsContainer");

        searchBtn.addEventListener('click', performSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch();
        });

        async function performSearch() {
            const query = searchInput.value.trim();
            if (!query) return;

            searchBtn.disabled = true;
            searchBtn.textContent = 'Searching...';
            resultsContainer.innerHTML = '<div style="text-align:center; padding:20px;">Searching...</div>';

            try {
                const r = await fetch('/api/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query })
                });
                const j = await r.json();

                if (!j.success) throw new Error(j.error || 'Search failed');

                displaySearchResults(j.results, j.total, j.query);
            } catch (err) {
                resultsContainer.innerHTML = `<div style="color:crimson; padding:20px;">Error: ${err.message}</div>`;
            } finally {
                searchBtn.disabled = false;
                searchBtn.textContent = 'Search All Indexes';
            }
        }

        function displaySearchResults(results, total, query) {
            searchResults.style.display = 'block';
            resultCount.textContent = total;

            if (total === 0) {
                resultsContainer.innerHTML = '<div style="text-align:center; padding:20px;">No results found.</div>';
                return;
            }

            resultsContainer.innerHTML = '';

            results.forEach(result => {
                const resultDiv = document.createElement('div');
                resultDiv.style.border = '1px solid #eee';
                resultDiv.style.borderRadius = '4px';
                resultDiv.style.margin = '8px 0';
                resultDiv.style.padding = '12px';

                // Score and file info
                const header = document.createElement('div');
                header.style.display = 'flex';
                header.style.justifyContent = 'space-between';
                header.style.marginBottom = '8px';
                header.innerHTML = `
                    <span style="font-weight:bold;">Score: ${result.score.toFixed(2)}</span>
                    <span style="color:#666; font-size:12px;">${result.source.file_name}</span>
                `;
                resultDiv.appendChild(header);

                // Directory and file type
                const meta = document.createElement('div');
                meta.style.fontSize = '12px';
                meta.style.color = '#666';
                meta.style.marginBottom = '8px';
                meta.textContent = `Device: ${result.source.device_id} | Subdir: ${result.source.subdirectory || 'N/A'} | Indexed: ${new Date(result.source.timestamp).toLocaleString()}`;
                resultDiv.appendChild(meta);

                // Content preview with highlights
                const contentDiv = document.createElement('div');
                contentDiv.style.maxHeight = '200px';
                contentDiv.style.overflow = 'auto';
                contentDiv.style.border = '1px solid #f0f0f0';
                contentDiv.style.padding = '8px';
                contentDiv.style.background = '#f9f9f9';
                contentDiv.style.borderRadius = '4px';

                if (result.highlight && result.highlight.extracted_text) {
                    contentDiv.innerHTML = result.highlight.extracted_text.map(h => `<div ...>${h.replace(new RegExp(`(${query})`, 'gi'), '<mark>$1</mark>')}</div>`).join('');
                } else if (result.highlight && result.highlight.html_content) {
                    contentDiv.innerHTML = result.highlight.html_content.map(h => `<div ...>${h.replace(new RegExp(`(${query})`, 'gi'), '<mark>$1</mark>')}</div>`).join('');
                } else {
                    const preview = result.source.extracted_text.substring(0, 500) + (result.source.extracted_text.length > 500 ? '...' : '');
                    contentDiv.textContent = preview;
                }

                resultDiv.appendChild(contentDiv);
                resultsContainer.appendChild(resultDiv);
            });
        }
    }

    function updateIngestBtn() {
        const checkedBoxes = treeView.querySelectorAll('input[type="checkbox"]:checked');
        ingestBtn.disabled = checkedBoxes.length === 0;
    }

    folderInput.addEventListener("change", async (e) => {
        // Check if an index is selected
        const selectedIndex = getCookie('selectedIndex');
        if (!selectedIndex || selectedIndex === 'null' || selectedIndex === '') {
            alert('⚠️ No index selected!\n\nPlease select an index from the settings page before uploading files.');
            e.target.value = ''; // Clear the file input
            return;
        }
        
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            // Create FormData to upload files
            const formData = new FormData();
            const relativePaths = [];
            files.forEach(file => {
                formData.append('files', file);
                relativePaths.push(file.webkitRelativePath);
            });
            formData.append('relativePaths', JSON.stringify(relativePaths));
            formData.append('folderName', 'uploaded-folder');

            try {
                const response = await fetch('/upload', {
                    method: 'POST',
                    body: formData
                });
                const result = await response.json();
                console.log('📥 Upload response:', result);
                console.log('   - alreadyExists:', result.alreadyExists);
                console.log('   - folderHash:', result.folderHash);
                console.log('   - deviceId:', result.deviceId);
                
                if (result.success) {
                    // Check if folder already exists and warn user with enhanced UI
                    if (result.alreadyExists) {
                        // Show warning banner above tree
                        const warningBanner = document.createElement('div');
                        warningBanner.style.cssText = `
                            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
                            border: 2px solid #f59e0b;
                            border-radius: 8px;
                            padding: 16px;
                            margin-bottom: 16px;
                            display: flex;
                            align-items: center;
                            gap: 12px;
                        `;
                        warningBanner.innerHTML = `
                            <span style="font-size: 24px;">⚠️</span>
                            <div style="flex: 1;">
                                <div style="font-weight: 600; color: #92400e; margin-bottom: 4px;">Duplicate Folder Detected</div>
                                <div style="color: #78350f; font-size: 0.9rem;">
                                    This folder has already been uploaded and indexed. Proceeding will create duplicate content.
                                </div>
                            </div>
                        `;
                        treeView.parentElement.insertBefore(warningBanner, treeView);
                        
                        const proceed = confirm('⚠️ WARNING: Duplicate Folder Detected!\n\nThis folder appears to have been indexed already.\n\n• Device ID: ' + result.deviceId + '\n• Folder Hash: ' + result.folderHash.substring(0, 16) + '...\n\nIf you proceed, duplicate content will be created in the index.\n\nDo you want to proceed anyway?');
                        if (!proceed) {
                            // Clear the tree view and show message
                            treeView.innerHTML = `
                                <div style="text-align: center; padding: 40px; color: #64748b;">
                                    <div style="font-size: 48px; margin-bottom: 12px;">🚫</div>
                                    <div style="font-weight: 600; font-size: 1.1rem; margin-bottom: 8px;">Upload Cancelled</div>
                                    <div>This folder has already been indexed</div>
                                </div>
                            `;
                            return;
                        }
                    } else {
                        // Show success indicator
                        const successBanner = document.createElement('div');
                        successBanner.style.cssText = `
                            background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
                            border: 2px solid #10b981;
                            border-radius: 8px;
                            padding: 16px;
                            margin-bottom: 16px;
                            display: flex;
                            align-items: center;
                            gap: 12px;
                        `;
                        successBanner.innerHTML = `
                            <span style="font-size: 24px;">✅</span>
                            <div style="flex: 1;">
                                <div style="font-weight: 600; color: #065f46; margin-bottom: 4px;">New Folder Ready</div>
                                <div style="color: #047857; font-size: 0.9rem;">
                                    This folder is new and ready to be indexed. Device ID: ${result.deviceId}
                                </div>
                            </div>
                        `;
                        treeView.parentElement.insertBefore(successBanner, treeView);
                    }
    
                    // Store upload info for later validation during ingestion
                    treeView.setAttribute('data-upload-info', JSON.stringify({
                        folderHash: result.folderHash,
                        deviceId: result.deviceId,
                        alreadyExists: result.alreadyExists
                    }));
    
                    renderTree(result.tree);
                } else {
                    alert('Upload failed: ' + result.error);
                }
            } catch (error) {
                alert('Upload error: ' + error.message);
            }
        }
    });

    selectAllBtn.addEventListener("click", () => {
        const checkboxes = treeView.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = true);
        updateIngestBtn();
    });

    deselectAllBtn.addEventListener("click", () => {
        const checkboxes = treeView.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = false);
        updateIngestBtn();
    });

    function renderTree(tree) {
        treeView.innerHTML = "";
        function render(obj, parent, indent = 0) {
            Object.entries(obj).forEach(([name, value]) => {
                const row = document.createElement("div");
                row.style.marginLeft = indent + "px";
                
                if (value === null) {
                    // File
                    row.innerHTML = `
                        <div style="display:flex; align-items:center; padding:4px; gap:8px">
                            <input type="checkbox" style="width:16px; height:16px; margin:0">
                            <span>📄</span>
                            <span>${name}</span>
                        </div>
                    `;
                } else {
                    // Folder
                    row.innerHTML = `
                        <div style="display:flex; align-items:center; padding:4px; gap:8px; cursor:pointer">
                            <input type="checkbox" style="width:16px; height:16px; margin:0">
                            <span>📁</span>
                            <span>${name}</span>
                        </div>
                    `;
                    const content = document.createElement("div");
                    content.style.display = "none";
                    row.firstElementChild.addEventListener("click", (e) => {
                        if (e.target.tagName === 'INPUT') return;
                        const isOpen = content.style.display === "block";
                        content.style.display = isOpen ? "none" : "block";
                        row.querySelector("span").textContent = isOpen ? "📁" : "📂";
                    });
                    row.appendChild(content);
                    render(value, content, indent + 20);
                }
                parent.appendChild(row);
            });
        }
        render(tree, treeView);
        const checkboxes = treeView.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => {
            cb.addEventListener('change', updateIngestBtn);
        });
        updateIngestBtn();
    }

    // Progress modal functions
    let progressModal = null;
    let progressBar = null;
    let progressText = null;
    let progressStatus = null;

    function showProgressModal(totalFiles) {
        // Create modal if it doesn't exist
        if (!progressModal) {
            progressModal = document.createElement('div');
            progressModal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            `;

            const modalContent = document.createElement('div');
            modalContent.style.cssText = `
                background: white;
                padding: 20px;
                border-radius: 8px;
                width: 400px;
                text-align: center;
            `;

            progressText = document.createElement('div');
            progressText.style.cssText = `
                margin-bottom: 15px;
                font-weight: bold;
            `;

            progressBar = document.createElement('div');
            progressBar.style.cssText = `
                width: 100%;
                height: 20px;
                background: #f0f0f0;
                border-radius: 10px;
                overflow: hidden;
                margin-bottom: 10px;
            `;

            const progressFill = document.createElement('div');
            progressFill.style.cssText = `
                width: 0%;
                height: 100%;
                background: #007bff;
                transition: width 0.3s ease;
            `;
            progressBar.appendChild(progressFill);

            progressStatus = document.createElement('div');
            progressStatus.style.cssText = `
                font-size: 14px;
                color: #666;
            `;

            modalContent.appendChild(progressText);
            modalContent.appendChild(progressBar);
            modalContent.appendChild(progressStatus);
            progressModal.appendChild(modalContent);
            document.body.appendChild(progressModal);
        }

        progressText.textContent = `Processing 0/${totalFiles} files...`;
        progressBar.firstChild.style.width = '0%';
        progressStatus.textContent = 'Starting ingestion...';
        progressModal.style.display = 'flex';
    }

    function updateProgress(data) {
        if (!progressBar || !progressText || !progressStatus) return;

        progressText.textContent = `${data.current}/${data.total} files processed`;
        progressBar.firstChild.style.width = `${data.progress}%`;
        progressStatus.textContent = data.message;

        // Auto-hide on completion
        if (data.progress >= 100) {
            setTimeout(() => hideProgressModal(), 2000);
        }
    }

    function hideProgressModal() {
        if (progressModal) {
            progressModal.style.display = 'none';
        }
    }

    if (ingestBtn) {
        ingestBtn.addEventListener("click", async () => {
            console.log('Ingest button clicked');
            
            // Check if an index is selected
            const selectedIndex = getCookie('selectedIndex');
            if (!selectedIndex || selectedIndex === 'null' || selectedIndex === '') {
                alert('⚠️ No index selected!\n\nPlease select an index from the settings page before uploading files.');
                return;
            }
            
            const checkedBoxes = Array.from(treeView.querySelectorAll('input[type="checkbox"]:checked'))
                .filter(cb => {
                    // Only include files, not folders (folders have a div.content)
                    const row = cb.closest('div');
                    return !row.querySelector('div.content');
                });
            
            console.log('Checked boxes found:', checkedBoxes.length);
    
        const selectedFiles = checkedBoxes.map(cb => {
            const path = [];
            let el = cb.closest('div[style*="display:flex"]'); // the inner div
            while (el && el !== treeView) {
                const spans = el.querySelectorAll('span');
                if (spans.length >= 2) {
                    path.unshift(spans[1].textContent);
                }
                // go to the parent folder's inner div
                const row = el.parentElement;
                const content = row.parentElement;
                if (content && content !== treeView && content.parentElement) {
                    const parentRow = content.parentElement;
                    const parentInner = parentRow.querySelector('div[style*="display:flex"]');
                    if (parentInner) {
                        el = parentInner;
                    } else {
                        break;
                    }
                } else {
                    break;
                }
            }
            return path.join('/');
        });
        
        console.log('Selected files:', selectedFiles);
    
        if (selectedFiles.length === 0) {
            alert('Please select files to ingest');
            return;
        }
    
        // Additional validation: Check if we're trying to ingest a folder that already exists
        try {
            const indexResponse = await fetch('/api/selected-index');
            const indexData = await indexResponse.json();
            const currentIndex = indexData.selectedIndex;
    
            if (currentIndex) {
                // Get folder hash from the upload data stored in a data attribute
                const uploadData = treeView.getAttribute('data-upload-info');
                if (uploadData) {
                    const parsedData = JSON.parse(uploadData);
                    if (parsedData.alreadyExists) {
                        const proceed = confirm('Warning: This folder has already been indexed. Ingesting will create duplicate content.\n\nDo you want to proceed anyway?');
                        if (!proceed) {
                            return;
                        }
                    }
                }
            }
        } catch (error) {
            console.warn('Could not check for existing folder:', error);
        }
    
        // Show progress modal
        showProgressModal(selectedFiles.length);
    
        try {
            const response = await fetch('/ingest', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'text/event-stream'
                },
                body: JSON.stringify({ files: selectedFiles })
            });
    
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
    
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
    
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
    
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
    
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const progressData = JSON.parse(line.substring(6));
                            updateProgress(progressData);
                        } catch (e) {
                            console.warn('Failed to parse progress data:', line);
                        }
                    }
                }
            }
    
            // Success - modal will be hidden by the completion message
        } catch (error) {
            hideProgressModal();
            alert('Error ingesting files: ' + error.message);
        }
    });
    } else {
        console.error('ingestBtn element not found!');
    }

    // On load, fetch current selected index from server and sync with cookie
    // Use setTimeout to ensure DOM is fully ready
    setTimeout(async () => {
        const displayElement = document.getElementById('selectedIndexDisplay');
        console.log('Timeout - selectedIndexDisplay element:', displayElement);
        
        if (!displayElement) {
            console.error('selectedIndexDisplay element not found after timeout!');
            return;
        }
        
        try {
            console.log('Fetching selected index from API...');
            const r = await fetch('/api/selected-index');
            const j = await r.json();
            console.log('API response:', j);
            
            if (j && j.selectedIndex) {
                console.log('Setting selectedIndexDisplay to:', j.selectedIndex);
                displayElement.textContent = j.selectedIndex;
                displayElement.style.color = '#2563eb';
                
                // Save to cookie
                setCookie('selectedIndex', j.selectedIndex);
                console.log('Saved to cookie:', j.selectedIndex);
            } else {
                // If no index from API, try cookie
                const cookieIndex = getCookie('selectedIndex');
                if (cookieIndex) {
                    console.log('Using index from cookie:', cookieIndex);
                    displayElement.textContent = cookieIndex;
                    displayElement.style.color = '#2563eb';
                    
                    // Update server with cookie value
                    await fetch('/api/selected-index', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ index: cookieIndex })
                    });
                } else {
                    console.log('No selected index found');
                    displayElement.textContent = '(none)';
                }
            }
        } catch (err) {
            console.error('Error loading selected index:', err);
            // Fallback to cookie
            const cookieIndex = getCookie('selectedIndex');
            if (cookieIndex && displayElement) {
                displayElement.textContent = cookieIndex;
                displayElement.style.color = '#2563eb';
            }
        }
    }, 100);

    // Checksums Modal Management
    const openChecksumsBtn = document.getElementById('openChecksumsBtn');
    const checksumsModal = document.getElementById('checksumsModal');
    const closeChecksumsBtn = document.getElementById('closeChecksumsBtn');
    const refreshChecksumsBtn = document.getElementById('refreshChecksumsBtn');
    const checksumsContent = document.getElementById('checksumsContent');

    if (openChecksumsBtn) {
        openChecksumsBtn.addEventListener('click', () => {
            checksumsModal.style.display = 'flex';
            loadChecksums();
        });
    }

    if (closeChecksumsBtn) {
        closeChecksumsBtn.addEventListener('click', () => {
            checksumsModal.style.display = 'none';
        });
    }

    if (refreshChecksumsBtn) {
        refreshChecksumsBtn.addEventListener('click', loadChecksums);
    }

    async function loadChecksums() {
        checksumsContent.innerHTML = '<div style="text-align:center; padding:20px; color:#64748b;">Loading checksums...</div>';
        
        try {
            const response = await fetch('/api/checksums');
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to load checksums');
            }

            displayChecksums(data.checksums);
        } catch (error) {
            checksumsContent.innerHTML = `<div style="color:#ef4444; padding:20px; text-align:center;">Error: ${error.message}</div>`;
        }
    }

    function displayChecksums(checksums) {
        if (!checksums || checksums.length === 0) {
            checksumsContent.innerHTML = '<div style="text-align:center; padding:40px; color:#64748b;"><div style="font-size:48px; margin-bottom:10px;">📭</div><div>No uploaded folders yet</div></div>';
            return;
        }

        let html = '<div style="display:flex; flex-direction:column; gap:12px;">';
        
        checksums.forEach((item, index) => {
            const date = new Date(item.timestamp);
            const formattedDate = date.toLocaleString();
            
            html += `
                <div style="border: 2px solid #e2e8f0; border-radius:8px; padding:16px; background:white; transition: all 0.2s;" 
                     onmouseover="this.style.borderColor='#2563eb'; this.style.boxShadow='0 4px 6px -1px rgba(0,0,0,0.1)'" 
                     onmouseout="this.style.borderColor='#e2e8f0'; this.style.boxShadow='none'">
                    <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:12px;">
                        <div style="flex:1;">
                            <div style="font-weight:600; font-size:1.1rem; color:#1e293b; margin-bottom:4px;">
                                📁 ${escapeHtml(item.folderName)}
                            </div>
                            <div style="font-size:0.85rem; color:#64748b;">
                                Device ID: <span style="font-family:monospace; background:#f1f5f9; padding:2px 6px; border-radius:4px;">${escapeHtml(item.deviceId)}</span>
                            </div>
                        </div>
                        <button class="delete-checksum-btn" data-key="${escapeHtml(item.key)}" 
                                style="background:#fee2e2; color:#dc2626; border:1px solid #fecaca; padding:6px 12px; border-radius:6px; cursor:pointer; font-size:0.85rem; font-weight:600; transition: all 0.2s;"
                                onmouseover="this.style.background='#fecaca'" 
                                onmouseout="this.style.background='#fee2e2'">
                            🗑️ Delete
                        </button>
                    </div>
                    <div style="display:grid; grid-template-columns:auto 1fr; gap:8px; font-size:0.85rem; color:#64748b; margin-bottom:8px;">
                        <span>Uploaded:</span>
                        <span>${formattedDate}</span>
                        <span>Checksum:</span>
                        <span style="font-family:monospace; font-size:0.75rem; word-break:break-all; background:#f1f5f9; padding:4px 6px; border-radius:4px;">${item.hash.substring(0, 16)}...${item.hash.substring(item.hash.length - 16)}</span>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        checksumsContent.innerHTML = html;

        // Add delete event listeners
        document.querySelectorAll('.delete-checksum-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const key = e.target.dataset.key;
                if (confirm('Are you sure you want to delete this checksum? This will allow the folder to be uploaded again.')) {
                    await deleteChecksum(key);
                }
            });
        });
    }

    async function deleteChecksum(key) {
        try {
            const response = await fetch(`/api/checksums/${encodeURIComponent(key)}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to delete checksum');
            }

            // Reload the checksums list
            loadChecksums();
        } catch (error) {
            alert('Error deleting checksum: ' + error.message);
        }
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
});


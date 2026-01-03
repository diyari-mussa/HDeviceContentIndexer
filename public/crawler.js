document.addEventListener("DOMContentLoaded", () => {
    const scanBtn = document.getElementById('scanBtn');
    const crawlBtn = document.getElementById('crawlBtn');
    const cleanupBtn = document.getElementById('cleanupBtn');
    const foldersSection = document.getElementById('foldersSection');
    const foldersList = document.getElementById('foldersList');
    const folderCount = document.getElementById('folderCount');
    const selectAllFoldersBtn = document.getElementById('selectAllFoldersBtn');
    const deselectAllFoldersBtn = document.getElementById('deselectAllFoldersBtn');
    const selectNewOnlyBtn = document.getElementById('selectNewOnlyBtn');
    const progressSection = document.getElementById('progressSection');
    const crawlProgressBar = document.getElementById('crawlProgressBar');
    const crawlStatus = document.getElementById('crawlStatus');
    const crawlDetails = document.getElementById('crawlDetails');
    const selectedIndexDisplay = document.getElementById('selectedIndexDisplay');

    let discoveredFolders = [];

    // Helper function to get cookie value
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }

    // Load selected index from API
    async function loadSelectedIndex() {
        try {
            const r = await fetch('/api/selected-index');
            const j = await r.json();
            if (j && j.selectedIndex && selectedIndexDisplay) {
                selectedIndexDisplay.textContent = j.selectedIndex;
                selectedIndexDisplay.style.color = '#2563eb';
            }
        } catch (err) {
            console.error('Error loading selected index:', err);
        }
    }

    loadSelectedIndex();

    // Clean up temp folders
    cleanupBtn.addEventListener('click', async () => {
        const proceed = confirm('🧹 Clean up all temporary folders?\n\nThis will remove all folders starting with "temp-" from the uploads directory.');
        if (!proceed) return;

        cleanupBtn.disabled = true;
        cleanupBtn.textContent = '🧹 Cleaning...';

        try {
            const response = await fetch('/api/cleanup-temp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            const data = await response.json();

            if (data.success) {
                alert(`✅ ${data.message}\n\nCleaned folders:\n${data.folders.length > 0 ? data.folders.join('\n') : 'None found'}`);
                // Re-scan to update the list
                if (foldersSection.style.display !== 'none') {
                    scanBtn.click();
                }
            } else {
                alert('❌ Cleanup failed: ' + data.error);
            }
        } catch (error) {
            console.error('Cleanup error:', error);
            alert('❌ Error during cleanup: ' + error.message);
        } finally {
            cleanupBtn.disabled = false;
            cleanupBtn.textContent = '🧹 Clean Up Temp Folders';
        }
    });

    // Scan uploads folder for device folders
    scanBtn.addEventListener('click', async () => {
        // Check if an index is selected
        const selectedIndex = getCookie('selectedIndex');
        if (!selectedIndex || selectedIndex === 'null' || selectedIndex === '') {
            alert('⚠️ No index selected!\n\nPlease select an index from the settings page before scanning.');
            return;
        }

        const forceReindex = document.getElementById('forceReindexToggle').checked;

        scanBtn.disabled = true;
        scanBtn.textContent = '🔍 Scanning...';
        foldersList.innerHTML = '<div style="text-align: center; padding: 20px; color: #64748b;">Scanning uploads folder...</div>';
        foldersSection.style.display = 'block';

        try {
            const response = await fetch('/api/crawler/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ forceReindex })
            });

            const data = await response.json();

            if (data.success) {
                discoveredFolders = data.folders;
                renderFolders(discoveredFolders);
                const newCount = discoveredFolders.filter(f => !f.alreadyExists && f.supportedFileCount > 0).length;
                const existingCount = discoveredFolders.filter(f => f.alreadyExists).length;
                const neglectedCount = discoveredFolders.filter(f => !f.alreadyExists && f.supportedFileCount === 0).length;
                folderCount.textContent = `Found ${discoveredFolders.length} folder(s) — ${newCount} new, ${existingCount} already indexed, ${neglectedCount} neglected`;
                folderCount.style.color = '#1e293b';
                folderCount.style.fontWeight = '600';
            } else {
                alert('Scan failed: ' + data.error);
                foldersSection.style.display = 'none';
            }
        } catch (error) {
            console.error('Scan error:', error);
            alert('Error scanning folder: ' + error.message);
            foldersSection.style.display = 'none';
        } finally {
            scanBtn.disabled = false;
            scanBtn.textContent = '🔍 Scan Uploads Folder';
        }
    });

    // Render discovered folders
    function renderFolders(folders) {
        if (folders.length === 0) {
            foldersList.innerHTML = '<div style="text-align: center; padding: 40px; color: #64748b;">No folders found in uploads directory.</div>';
            crawlBtn.disabled = true;
            return;
        }

        foldersList.innerHTML = '';

        // Separate folders by category
        const newFolders = folders.filter(f => !f.alreadyExists && f.supportedFileCount > 0);
        const existingFolders = folders.filter(f => f.alreadyExists);
        const neglectedFolders = folders.filter(f => !f.alreadyExists && f.supportedFileCount === 0);

        // Render New Folders
        if (newFolders.length > 0) {
            const newSection = document.createElement('div');
            newSection.style.marginBottom = '24px';
            newSection.innerHTML = `<h3 style="color: #065f46; margin-bottom: 12px; font-size: 1.1rem;">✅ New Folders (${newFolders.length})</h3>`;
            foldersList.appendChild(newSection);
            newFolders.forEach((folder, index) => renderFolder(folder, index, true, 'new'));
        }

        // Render Already Indexed Folders
        if (existingFolders.length > 0) {
            const existingSection = document.createElement('div');
            existingSection.style.marginBottom = '24px';
            existingSection.innerHTML = `<h3 style="color: #92400e; margin-bottom: 12px; font-size: 1.1rem;">⚠️ Already Indexed (${existingFolders.length})</h3>`;
            foldersList.appendChild(existingSection);
            existingFolders.forEach((folder, index) => renderFolder(folder, newFolders.length + index, false, 'existing'));
        }

        // Render Neglected Folders
        if (neglectedFolders.length > 0) {
            const neglectedSection = document.createElement('div');
            neglectedSection.style.marginBottom = '24px';
            neglectedSection.innerHTML = `<h3 style="color: #64748b; margin-bottom: 12px; font-size: 1.1rem;">🚫 Neglected - No Supported Files (${neglectedFolders.length})</h3>`;
            foldersList.appendChild(neglectedSection);
            neglectedFolders.forEach((folder, index) => renderFolder(folder, newFolders.length + existingFolders.length + index, false, 'neglected'));
        }

        // Add change listeners to checkboxes
        const checkboxes = foldersList.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => {
            cb.addEventListener('change', updateCrawlButton);
        });

        updateCrawlButton();
    }

    // Render individual folder
    function renderFolder(folder, index, checked, category) {
        const folderDiv = document.createElement('div');
        
        let borderColor, bgGradient, statusIcon, statusText, statusColor;
        
        if (category === 'new') {
            borderColor = '#d1fae5';
            bgGradient = 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)';
            statusIcon = '✅';
            statusText = `New Folder - ${folder.supportedFileCount} supported file(s)`;
            statusColor = '#065f46';
        } else if (category === 'existing') {
            borderColor = '#fde68a';
            bgGradient = 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)';
            statusIcon = '🔒';
            statusText = 'Already Indexed';
            statusColor = '#92400e';
        } else { // neglected
            borderColor = '#e2e8f0';
            bgGradient = 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)';
            statusIcon = '🚫';
            statusText = `No supported files (.html/.txt/.csv/.xlsx/.pdf) - ${folder.fileCount} total file(s)`;
            statusColor = '#64748b';
        }

        folderDiv.style.cssText = `
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px;
            border: 2px solid ${borderColor};
            background: ${bgGradient};
            border-radius: 8px;
            margin-bottom: 12px;
        `;

        folderDiv.innerHTML = `
            <input type="checkbox" id="folder-${index}" data-folder-index="${index}" data-folder-name="${folder.name}" style="width: 20px; height: 20px; cursor: pointer;" ${checked ? 'checked' : ''} ${category === 'neglected' ? 'disabled' : ''}>
            <label for="folder-${index}" style="flex: 1; cursor: pointer; display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 24px;">${statusIcon}</span>
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: ${statusColor}; margin-bottom: 4px;">
                        📁 ${folder.name}
                    </div>
                    <div style="font-size: 0.85rem; color: #64748b; margin-bottom: 2px;">
                        Device ID: <code>${folder.deviceId}</code>
                    </div>
                    <div style="font-size: 0.85rem; color: #64748b; margin-bottom: 2px;">
                        Total Files: ${folder.fileCount} | Supported: ${folder.supportedFileCount} | Hash: <code>${folder.folderHash.substring(0, 12)}...</code>
                    </div>
                    <div style="font-size: 0.85rem; font-weight: 600; color: ${statusColor};">
                        ${statusText}
                    </div>
                </div>
            </label>
        `;

        foldersList.appendChild(folderDiv);
    }

    // Update crawl button state and show selection count
    function updateCrawlButton() {
        const checkedBoxes = foldersList.querySelectorAll('input[type="checkbox"]:checked:not([disabled])');
        const selectedCount = checkedBoxes.length;
        
        crawlBtn.disabled = selectedCount === 0;
        
        if (selectedCount > 0) {
            crawlBtn.textContent = `🤖 Start Crawling ${selectedCount} Selected Folder(s)`;
        } else {
            crawlBtn.textContent = `🤖 Start Crawling Selected Folders`;
        }
    }

    // Select/Deselect all folders
    selectAllFoldersBtn.addEventListener('click', () => {
        const checkboxes = foldersList.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = true);
        updateCrawlButton();
    });

    deselectAllFoldersBtn.addEventListener('click', () => {
        const checkboxes = foldersList.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = false);
        updateCrawlButton();
    });

    selectNewOnlyBtn.addEventListener('click', () => {
        const checkboxes = foldersList.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => {
            const index = parseInt(cb.dataset.folderIndex);
            cb.checked = !discoveredFolders[index].alreadyExists;
        });
        updateCrawlButton();
    });

    // Start crawling selected folders
    crawlBtn.addEventListener('click', async () => {
        // Check if an index is selected
        const selectedIndex = getCookie('selectedIndex');
        if (!selectedIndex || selectedIndex === 'null' || selectedIndex === '') {
            alert('⚠️ No index selected!\n\nPlease create or select an index from the settings page before crawling folders.');
            return;
        }

        const checkedBoxes = Array.from(foldersList.querySelectorAll('input[type="checkbox"]:checked'));
        const selectedFolders = checkedBoxes.map(cb => {
            const index = parseInt(cb.dataset.folderIndex);
            return discoveredFolders[index];
        });

        if (selectedFolders.length === 0) {
            alert('Please select at least one folder to crawl.');
            return;
        }

        // Confirm if there are already indexed folders
        const alreadyIndexedCount = selectedFolders.filter(f => f.alreadyExists).length;
        if (alreadyIndexedCount > 0) {
            const proceed = confirm(`⚠️ Warning: ${alreadyIndexedCount} of the selected folders have already been indexed.\n\nRe-indexing will create duplicate content.\n\nDo you want to proceed?`);
            if (!proceed) return;
        }

        // Show progress section
        progressSection.style.display = 'block';
        crawlProgressBar.style.width = '0%';
        crawlStatus.textContent = 'Starting crawler...';
        crawlDetails.innerHTML = '';

        // Disable buttons
        crawlBtn.disabled = true;
        scanBtn.disabled = true;

        try {
            const response = await fetch('/api/crawler/crawl', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'text/event-stream'
                },
                body: JSON.stringify({ folders: selectedFolders })
            });

            if (!response.ok) {
                // Try to parse error message from JSON response
                try {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                } catch (parseError) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
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
                            updateCrawlProgress(progressData);
                        } catch (e) {
                            console.warn('Failed to parse progress data:', line);
                        }
                    }
                }
            }

            // Crawl completed
            crawlStatus.textContent = '✅ Crawling completed successfully!';
            crawlStatus.style.color = '#10b981';
            
            // Re-scan to update the list
            setTimeout(() => {
                scanBtn.click();
            }, 2000);

        } catch (error) {
            console.error('Crawl error:', error);
            crawlStatus.textContent = '❌ Error: ' + error.message;
            crawlStatus.style.color = '#ef4444';
        } finally {
            crawlBtn.disabled = false;
            scanBtn.disabled = false;
        }
    });

    // Update crawl progress
    function updateCrawlProgress(data) {
        if (data.progress !== undefined) {
            crawlProgressBar.style.width = data.progress + '%';
        }

        if (data.message) {
            crawlStatus.textContent = data.message;
        }

        if (data.detail) {
            const detailLine = document.createElement('div');
            detailLine.style.cssText = 'padding: 4px 0; border-bottom: 1px solid #e2e8f0;';
            
            let icon = '📄';
            let color = '#64748b';
            if (data.detail.includes('✅') || data.detail.includes('Success')) {
                icon = '✅';
                color = '#10b981';
            } else if (data.detail.includes('⚠️') || data.detail.includes('Skip')) {
                icon = '⚠️';
                color = '#f59e0b';
            } else if (data.detail.includes('❌') || data.detail.includes('Error')) {
                icon = '❌';
                color = '#ef4444';
            }
            
            detailLine.innerHTML = `<span style="color: ${color};">${icon} ${data.detail}</span>`;
            crawlDetails.appendChild(detailLine);
            crawlDetails.scrollTop = crawlDetails.scrollHeight;
        }
    }
});

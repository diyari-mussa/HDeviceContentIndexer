document.addEventListener('DOMContentLoaded', () => {
    const devicesContainer = document.getElementById('devicesContainer');
    const selectedIndexDisplay = document.getElementById('selectedIndexDisplay');
    const refreshBtn = document.getElementById('refreshBtn');

    // Pagination and search state
    let currentPage = 1;
    let pageSize = 50;
    let totalPages = 1;
    let totalDevices = 0;
    let searchQuery = '';
    let searchTimeout = null;

    // Helper function to get cookie value
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }

    // Load selected index from cookie
    const selectedIndex = getCookie('selectedIndex');
    if (selectedIndex && selectedIndexDisplay) {
        selectedIndexDisplay.textContent = selectedIndex;
    } else {
        selectedIndexDisplay.textContent = 'None selected';
        selectedIndexDisplay.style.color = '#ef4444';
    }

    // Create search and pagination UI
    function createSearchAndPaginationUI() {
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'card';
        controlsDiv.style.cssText = `
            margin-bottom: 24px;
            display: flex;
            align-items: center;
            gap: 20px;
            flex-wrap: wrap;
            padding: 15px; 
            border: 1px solid var(--border-color);
        `;

        // Search input
        const searchContainer = document.createElement('div');
        searchContainer.style.cssText = 'flex: 1; min-width: 250px;';
        searchContainer.innerHTML = `
            <input 
                type="text" 
                id="deviceSearchInput" 
                class="search-input-mock"
                placeholder="🔍 Search devices by name..."
            />
        `;

        // Pagination info
        const paginationInfo = document.createElement('div');
        paginationInfo.id = 'paginationInfo';
        paginationInfo.style.cssText = `
            font-size: 0.9rem;
            color: var(--text-secondary);
            font-weight: 500;
        `;

        controlsDiv.appendChild(searchContainer);
        controlsDiv.appendChild(paginationInfo);

        return controlsDiv;
    }

    // Create pagination controls
    function createPaginationControls() {
        const paginationDiv = document.createElement('div');
        paginationDiv.id = 'paginationControls';
        paginationDiv.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            margin-top: 32px;
            flex-wrap: wrap;
        `;

        return paginationDiv;
    }

    // Update pagination info
    function updatePaginationInfo() {
        const paginationInfo = document.getElementById('paginationInfo');
        if (paginationInfo) {
            const start = totalDevices === 0 ? 0 : (currentPage - 1) * pageSize + 1;
            const end = Math.min(currentPage * pageSize, totalDevices);
            paginationInfo.textContent = `Showing ${start}-${end} of ${totalDevices} devices`;
        }
    }

    // Render pagination controls
    function renderPaginationControls() {
        const paginationControls = document.getElementById('paginationControls');
        if (!paginationControls) return;

        paginationControls.innerHTML = '';

        if (totalPages <= 1) return;

        // Previous button
        const prevBtn = document.createElement('button');
        prevBtn.textContent = '← Previous';
        prevBtn.className = 'pagination-btn';
        if (currentPage === 1) prevBtn.disabled = true;
        
        prevBtn.onclick = () => {
            if (currentPage > 1) {
                currentPage--;
                fetchDevices();
            }
        };
        paginationControls.appendChild(prevBtn);

        // Page numbers
        const maxPageButtons = 7;
        let startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
        let endPage = Math.min(totalPages, startPage + maxPageButtons - 1);

        if (endPage - startPage < maxPageButtons - 1) {
            startPage = Math.max(1, endPage - maxPageButtons + 1);
        }

        if (startPage > 1) {
            const firstBtn = document.createElement('button');
            firstBtn.textContent = '1';
            firstBtn.className = 'pagination-btn';
            firstBtn.onclick = () => {
                currentPage = 1;
                fetchDevices();
            };
            paginationControls.appendChild(firstBtn);

            if (startPage > 2) {
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                ellipsis.style.cssText = 'padding: 8px; color: var(--text-secondary);';
                paginationControls.appendChild(ellipsis);
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.textContent = i;
            pageBtn.className = 'pagination-btn' + (i === currentPage ? ' active' : '');
            pageBtn.onclick = () => {
                currentPage = i;
                fetchDevices();
            };
            paginationControls.appendChild(pageBtn);
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                ellipsis.style.cssText = 'padding: 8px; color: var(--text-secondary);';
                paginationControls.appendChild(ellipsis);
            }

            const lastBtn = document.createElement('button');
            lastBtn.textContent = totalPages;
            lastBtn.className = 'pagination-btn';
            lastBtn.onclick = () => {
                currentPage = totalPages;
                fetchDevices();
            };
            paginationControls.appendChild(lastBtn);
        }

        // Next button
        const nextBtn = document.createElement('button');
        nextBtn.textContent = 'Next →';
        nextBtn.className = 'pagination-btn';
        if (currentPage === totalPages) nextBtn.disabled = true;

        nextBtn.onclick = () => {
            if (currentPage < totalPages) {
                currentPage++;
                fetchDevices();
            }
        };
        paginationControls.appendChild(nextBtn);
    }

    // Fetch devices from selected index
    async function fetchDevices() {
        const existingControls = document.getElementById('searchControls');
        if (!existingControls) {
            const controlsUI = createSearchAndPaginationUI();
            controlsUI.id = 'searchControls';
            devicesContainer.parentElement.insertBefore(controlsUI, devicesContainer);

            // Add search event listener
            const searchInput = document.getElementById('deviceSearchInput');
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    searchQuery = e.target.value.trim();
                    currentPage = 1;
                    fetchDevices();
                }, 300);
            });

            searchInput.addEventListener('focus', function() {
                this.style.borderColor = '#3b82f6';
            });
            searchInput.addEventListener('blur', function() {
                this.style.borderColor = '#e2e8f0';
            });
        }

        devicesContainer.innerHTML = '<div class="loading">Loading devices...</div>';

        if (!selectedIndex || selectedIndex === 'null') {
            devicesContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">⚠️</div>
                    <h2>No Index Selected</h2>
                    <p>Please select an index from the Settings page to view devices.</p>
                    <a href="settings.html" class="btn btn-view" style="display: inline-block; margin-top: 20px; text-decoration: none;">Go to Settings</a>
                </div>
            `;
            return;
        }

        try {
            const params = new URLSearchParams({
                index: selectedIndex,
                page: currentPage,
                pageSize: pageSize
            });

            if (searchQuery) {
                params.append('search', searchQuery);
            }

            const response = await fetch(`/api/devices?${params}`);
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch devices');
            }

            totalDevices = data.total;
            totalPages = data.totalPages;
            
            updatePaginationInfo();
            renderDevices(data.devices);
            renderPaginationControls();

            // Add pagination controls after devices if not exists
            if (!document.getElementById('paginationControls')) {
                const paginationDiv = createPaginationControls();
                devicesContainer.parentElement.appendChild(paginationDiv);
            }

        } catch (error) {
            console.error('Error fetching devices:', error);
            devicesContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">❌</div>
                    <h2>Error Loading Devices</h2>
                    <p>${error.message}</p>
                </div>
            `;
        }
    }

    // Render devices
    function renderDevices(devices) {
        if (!devices || devices.length === 0) {
            devicesContainer.innerHTML = `
                <div class="card" style="text-align: center; padding: 40px;">
                    <div style="font-size: 3rem; margin-bottom: 20px;">📭</div>
                    <h2 style="margin-bottom: 10px;">No Devices Found</h2>
                    <p style="color: var(--text-secondary);">Upload some folders to see devices here.</p>
                    <a href="upload.html" class="btn btn-primary" style="display: inline-block; margin-top: 20px; text-decoration: none;">Upload Files</a>
                </div>
            `;
            return;
        }

        devicesContainer.innerHTML = '';

        devices.forEach(device => {
            const card = document.createElement('div');
            card.className = 'card device-card';

            const header = document.createElement('div');
            header.className = 'device-header';
            header.innerHTML = `
                <div class="device-name">
                    📱 ${escapeHtml(device.deviceId)}
                </div>
                <div class="device-actions">
                    <button class="btn btn-view view-files-btn" data-device="${escapeHtml(device.deviceId)}">
                        📄 View Files
                    </button>
                    <button class="btn btn-cleanup cleanup-folder-btn" data-device="${escapeHtml(device.deviceId)}">
                        🧹 Cleanup Folder
                    </button>
                    <button class="btn btn-delete delete-device-btn" data-device="${escapeHtml(device.deviceId)}">
                        🗑️ Delete
                    </button>
                </div>
            `;

            const stats = document.createElement('div');
            stats.className = 'device-stats';
            
            const indexedDate = new Date(device.firstIndexed);
            const lastUpdated = new Date(device.lastIndexed);
            
            stats.innerHTML = `
                <div class="stat-item">
                    <span class="stat-label">📄 Files:</span>
                    <span class="stat-value">${device.fileCount}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">📅 First Indexed:</span>
                    <span class="stat-value">${indexedDate.toLocaleDateString()}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">🕒 Last Updated:</span>
                    <span class="stat-value">${lastUpdated.toLocaleString()}</span>
                </div>
                ${device.folderHash ? `
                <div class="stat-item">
                    <span class="stat-label">🔑 Hash:</span>
                    <span class="stat-value" style="font-family: monospace; font-size: 0.75rem;">${device.folderHash.substring(0, 12)}...</span>
                </div>
                ` : ''}
            `;

            const filesList = document.createElement('div');
            filesList.className = 'files-list';
            filesList.id = `files-${device.deviceId}`;

            card.appendChild(header);
            card.appendChild(stats);
            card.appendChild(filesList);
            devicesContainer.appendChild(card);

            // View files button
            const viewBtn = card.querySelector('.view-files-btn');
            viewBtn.addEventListener('click', async () => {
                const filesList = document.getElementById(`files-${device.deviceId}`);
                
                if (filesList.style.display === 'block') {
                    filesList.style.display = 'none';
                    viewBtn.textContent = '📄 View Files';
                } else {
                    filesList.innerHTML = '<div style="text-align: center; padding: 20px; color: #64748b;">Loading files...</div>';
                    filesList.style.display = 'block';
                    viewBtn.textContent = '📄 Hide Files';
                    
                    try {
                        const response = await fetch(`/api/devices/${encodeURIComponent(device.deviceId)}/files?index=${encodeURIComponent(selectedIndex)}`);
                        const data = await response.json();
                        
                        if (!data.success) {
                            throw new Error(data.error || 'Failed to fetch files');
                        }
                        
                        renderFiles(filesList, data.files);
                    } catch (error) {
                        filesList.innerHTML = `<div style="text-align: center; padding: 20px; color: #ef4444;">Error: ${error.message}</div>`;
                    }
                }
            });

            // Cleanup folder button
            const cleanupBtn = card.querySelector('.cleanup-folder-btn');
            cleanupBtn.addEventListener('click', async () => {
                if (!confirm(`Are you sure you want to delete the physical folder for device "${device.deviceId}"?\n\nThis will only remove the folder from disk. The data will remain in Elasticsearch.`)) {
                    return;
                }

                cleanupBtn.disabled = true;
                cleanupBtn.textContent = '⏳ Cleaning...';

                try {
                    const response = await fetch(`/api/devices/${encodeURIComponent(device.deviceId)}/cleanup`, {
                        method: 'DELETE'
                    });
                    const data = await response.json();

                    if (!data.success) {
                        throw new Error(data.error || 'Failed to cleanup folder');
                    }

                    alert(`Physical folder for device "${device.deviceId}" has been deleted successfully!\n\nThe data remains in Elasticsearch.`);
                    cleanupBtn.textContent = '✓ Cleaned';
                    setTimeout(() => {
                        cleanupBtn.textContent = '🧹 Cleanup Folder';
                        cleanupBtn.disabled = false;
                    }, 2000);
                } catch (error) {
                    alert(`Error cleaning up folder: ${error.message}`);
                    cleanupBtn.disabled = false;
                    cleanupBtn.textContent = '🧹 Cleanup Folder';
                }
            });

            // Delete button
            const deleteBtn = card.querySelector('.delete-device-btn');
            deleteBtn.addEventListener('click', async () => {
                if (!confirm(`Are you sure you want to delete device "${device.deviceId}" and all its ${device.fileCount} files?\n\nThis action cannot be undone!`)) {
                    return;
                }

                deleteBtn.disabled = true;
                deleteBtn.textContent = '⏳ Deleting...';

                try {
                    const response = await fetch(`/api/devices/${encodeURIComponent(device.deviceId)}?index=${encodeURIComponent(selectedIndex)}`, {
                        method: 'DELETE'
                    });
                    const data = await response.json();

                    if (!data.success) {
                        throw new Error(data.error || 'Failed to delete device');
                    }

                    alert(`Device "${device.deviceId}" deleted successfully!\n\n${data.deletedCount} files removed.`);
                    fetchDevices(); // Refresh the list
                } catch (error) {
                    alert(`Error deleting device: ${error.message}`);
                    deleteBtn.disabled = false;
                    deleteBtn.textContent = '🗑️ Delete';
                }
            });
        });
    }

    // Render files list
    function renderFiles(container, files) {
        if (!files || files.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 20px; color: #64748b;">No files found.</div>';
            return;
        }

        container.innerHTML = '';
        files.forEach(file => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            
            const fileName = file._source.file_name || 'Unknown';
            const subdirectory = file._source.subdirectory || 'Root';
            const timestamp = new Date(file._source.timestamp).toLocaleString();
            
            fileItem.innerHTML = `
                <div>
                    <strong>📄 ${escapeHtml(fileName)}</strong>
                    <div style="font-size: 0.75rem; color: #64748b; margin-top: 4px;">
                        📁 ${escapeHtml(subdirectory)} • 🕒 ${timestamp}
                    </div>
                </div>
                <div style="font-size: 0.75rem; color: #64748b; font-family: monospace;">
                    ID: ${file._id.substring(0, 8)}...
                </div>
            `;
            
            container.appendChild(fileItem);
        });
    }

    // Helper function to escape HTML
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Refresh button
    refreshBtn.addEventListener('click', fetchDevices);

    // Initial load
    fetchDevices();
});

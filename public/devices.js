document.addEventListener('DOMContentLoaded', () => {
    const devicesContainer = document.getElementById('devicesContainer');
    const selectedIndexDisplay = document.getElementById('selectedIndexDisplay');
    const refreshBtn = document.getElementById('refreshBtn');

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

    // Fetch devices from selected index
    async function fetchDevices() {
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
            const response = await fetch(`/api/devices?index=${encodeURIComponent(selectedIndex)}`);
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch devices');
            }

            renderDevices(data.devices);
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
                <div class="empty-state">
                    <div class="empty-state-icon">📭</div>
                    <h2>No Devices Found</h2>
                    <p>Upload some folders to see devices here.</p>
                    <a href="upload.html" class="btn btn-view" style="display: inline-block; margin-top: 20px; text-decoration: none;">Upload Files</a>
                </div>
            `;
            return;
        }

        devicesContainer.innerHTML = '';

        devices.forEach(device => {
            const card = document.createElement('div');
            card.className = 'device-card';

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

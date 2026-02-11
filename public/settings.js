document.addEventListener("DOMContentLoaded", () => {
    const indicesList = document.getElementById('indicesList');
    const indexDocs = document.getElementById('indexDocs');
    const newIndexName = document.getElementById('newIndexName');
    const createIndexBtn = document.getElementById('createIndexBtn');
    const confirmIndexBtn = document.getElementById('confirmIndexBtn');
    const currentSelectedIndex = document.getElementById('currentSelectedIndex');
    const selectedIndexName = document.getElementById('selectedIndexName');
    const startElasticsearchBtn = document.getElementById('startElasticsearchBtn');

    let selectedIndex = null;

    // Helper function to get cookie value
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }

    // Check ES connection status
    const esStatus = {
        dot: document.querySelector('.status-dot'),
        text: document.querySelector('.status-text'),
        checkInterval: null
    };

    async function checkElasticsearchStatus() {
        try {
            const r = await fetch('/api/elasticsearch/status');
            const j = await r.json();
            
            const statusContainer = document.getElementById('esStatus');

            if (j.success && j.isConnected) {
                const statusColors = {
                    green: '#10b981',
                    yellow: '#f59e0b',
                    red: '#ef4444'
                };
                
                esStatus.dot.style.background = statusColors[j.status] || '#10b981';
                esStatus.text.textContent = `Connected (${j.status})`;
                
                if (j.clusterName) {
                    esStatus.text.textContent += ` - ${j.clusterName}`;
                }
                
                // Update status container styling for connected state
                if (statusContainer) {
                    statusContainer.style.background = 'rgba(16, 185, 129, 0.1)';
                    statusContainer.style.borderColor = '#10b981';
                }
                
                // Hide start button when connected
                const startEsContainer = document.getElementById('startEsContainer');
                if (startEsContainer) startEsContainer.style.display = 'none';
                return true;
            } else {
                esStatus.dot.style.background = '#ef4444';
                esStatus.text.textContent = 'Not connected';
                
                // Update status container styling for disconnected state
                if (statusContainer) {
                    statusContainer.style.background = 'rgba(239, 68, 68, 0.1)';
                    statusContainer.style.borderColor = '#ef4444';
                }
                
                // Show start button when not connected
                const startEsContainer = document.getElementById('startEsContainer');
                if (startEsContainer) startEsContainer.style.display = 'block';
                return false;
            }
        } catch (err) {
            esStatus.dot.style.background = '#f59e0b';
            esStatus.text.textContent = 'Connection error';
            
            // Update status container styling for error state
            const statusContainer = document.getElementById('esStatus');
            if (statusContainer) {
                statusContainer.style.background = 'rgba(245, 158, 11, 0.1)';
                statusContainer.style.borderColor = '#f59e0b';
            }
            
            // Show start button on connection error
            const startEsContainer = document.getElementById('startEsContainer');
            if (startEsContainer) startEsContainer.style.display = 'block';
            return false;
        }
    }

    // Start checking ES status
    checkElasticsearchStatus();
    esStatus.checkInterval = setInterval(checkElasticsearchStatus, 5000);

    // Start Elasticsearch button
    if (startElasticsearchBtn) {
        startElasticsearchBtn.addEventListener('click', async () => {
            startElasticsearchBtn.disabled = true;
            startElasticsearchBtn.textContent = '⏳ Starting...';
            
            try {
                const r = await fetch('/api/elasticsearch/start', { method: 'POST' });
                const j = await r.json();
                
                if (j.success) {
                    alert('Elasticsearch is starting. Please wait a moment for it to fully initialize.');
                    setTimeout(checkElasticsearchStatus, 3000);
                } else {
                    alert('Failed to start Elasticsearch: ' + (j.error || 'Unknown error'));
                }
            } catch (err) {
                alert('Error starting Elasticsearch: ' + err.message);
            } finally {
                startElasticsearchBtn.disabled = false;
                startElasticsearchBtn.textContent = '▶️ Start Elasticsearch';
            }
        });
    }

    // Fetch and render indices
    async function fetchIndices() {
        indicesList.innerHTML = '<div style="padding:40px; text-align:center; color:#64748b;">Loading indices...</div>';
        try {
            const r = await fetch('/api/indices');
            const j = await r.json();
            if (!j.success) throw new Error(j.error || 'Failed to get indices');
            renderIndices(j.indices || []);
        } catch (err) {
            indicesList.innerHTML = `<div style="color:#ef4444; padding:40px; text-align:center;">Error: ${err.message}</div>`;
        }
    }

    function renderIndices(indices) {
        indicesList.innerHTML = '';
        if (!indices || indices.length === 0) {
            indicesList.innerHTML = '<div style="padding:40px; text-align:center; color:#64748b;">📭 No indices found</div>';
            return;
        }

        indices.forEach(name => {
            const indexCard = document.createElement('div');
            indexCard.className = 'index-item';

            indexCard.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%;">
                    <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
                        <span style="font-size:18px;">📊</span>
                        <span class="index-name">${name}</span>
                    </div>
                    <button class="delete-index-btn delete-btn" data-index="${name}">🗑️ Delete</button>
                </div>
            `;

            const deleteBtn = indexCard.querySelector('.delete-btn');

            indexCard.addEventListener('click', async (e) => {
                if (e.target.classList.contains('delete-btn')) return;

                // Clear previous selection
                Array.from(indicesList.children).forEach(ch => {
                   ch.classList.remove('selected');
                });

                // Select current
                indexCard.classList.add('selected');

                selectedIndex = name;
                selectedIndexName.textContent = `(${name})`;
                confirmIndexBtn.disabled = false;
                
                // Update the "Current Selected Index" section immediately
                currentSelectedIndex.textContent = name;
                
                await fetchIndexDocs(name);
            });

            // Delete button click
            deleteBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                
                if (confirm(`Are you sure you want to delete the index "${name}"?\n\nThis action cannot be undone.`)) {
                    try {
                        const r = await fetch(`/api/indices/${encodeURIComponent(name)}`, { method: 'DELETE' });
                        const j = await r.json();
                        
                        if (j.success) {
                            // If the deleted index is the currently selected one, clear the cookie
                            const currentSelectedIndexCookie = getCookie('selectedIndex');
                            if (currentSelectedIndexCookie === name) {
                                document.cookie = 'selectedIndex=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                                console.log(`Cleared cookie for deleted index: ${name}`);
                                currentSelectedIndex.textContent = 'None';
                            }
                            
                            alert(`Index "${name}" deleted successfully`);
                            fetchIndices();
                            indexDocs.innerHTML = `
                                <div style="text-align:center; padding:40px; color:var(--text-secondary);">
                                    <div style="font-size:64px; margin-bottom:12px;">📊</div>
                                    <div style="font-size: 1.1rem; font-weight: 600; margin-bottom: 8px;">Select an index to preview</div>
                                    <div style="font-size: 0.9rem;">Choose an index from the left panel to view its documents</div>
                                </div>
                            `;
                            selectedIndexName.textContent = '';
                        } else {
                            alert('Failed to delete index: ' + (j.error || 'Unknown error'));
                        }
                    } catch (err) {
                        alert('Error deleting index: ' + err.message);
                    }
                }
            });

            indicesList.appendChild(indexCard);
        });
    }

    async function fetchIndexDocs(indexName) {
        indexDocs.innerHTML = '<div style="text-align:center; padding:40px; color:#64748b;">Loading documents...</div>';
        try {
            const r = await fetch(`/api/indices/${encodeURIComponent(indexName)}/documents`);
            const j = await r.json();
            if (!j.success) throw new Error(j.error || 'Failed to fetch docs');
            renderDocs(j.documents || []);
        } catch (err) {
            indexDocs.innerHTML = `<div style="color:#ef4444; padding:40px; text-align:center;">Error: ${err.message}</div>`;
        }
    }

    function renderDocs(docs) {
        if (!docs || docs.length === 0) {
            indexDocs.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-secondary);"><div style="font-size:48px; margin-bottom:10px;">📄</div><div>No documents found</div></div>';
            return;
        }
        indexDocs.innerHTML = '';
        docs.forEach((h, index) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'doc-card';

            const header = document.createElement('div');
            header.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
                padding-bottom: 8px;
                border-bottom: 1px solid var(--border-color);
            `;

            const docNumber = document.createElement('span');
            docNumber.style.cssText = `
                background: var(--primary-cyan);
                color: var(--bg-deep);
                padding: 4px 10px;
                border-radius: 4px;
                font-size: 0.75rem;
                font-weight: 600;
            `;
            docNumber.textContent = `Doc #${index + 1}`;

            const id = document.createElement('div');
            id.style.cssText = `
                font-size: 0.75rem;
                color: var(--text-secondary);
                font-family: 'Consolas', monospace;
                padding: 4px 8px;
            `;
            id.textContent = `ID: ${h._id.substring(0, 12)}...`;

            header.appendChild(docNumber);
            header.appendChild(id);

            const src = document.createElement('pre');
            src.style.cssText = `
                white-space: pre-wrap;
                word-wrap: break-word;
                word-break: break-all;
                overflow-wrap: break-word;
                margin: 0;
                font-size: 0.85rem;
                color: var(--text-primary);
                background: var(--bg-deep);
                padding: 10px;
                border: 1px solid var(--border-color);
                border-radius: 4px;
                max-height: 200px;
                overflow: auto;
                font-family: 'Consolas', monospace;
            `;
            src.textContent = JSON.stringify(h._source, null, 2);

            wrapper.appendChild(header);
            wrapper.appendChild(src);
            indexDocs.appendChild(wrapper);
        });
    }

    // Create index
    createIndexBtn.addEventListener('click', async () => {
        const indexName = newIndexName.value.trim();
        if (!indexName) {
            alert('Please enter an index name');
            return;
        }

        try {
            const r = await fetch('/api/indices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ index: indexName })
            });
            const j = await r.json();

            if (j.success) {
                alert(`Index "${indexName}" created successfully`);
                newIndexName.value = '';
                fetchIndices();
            } else {
                alert('Failed to create index: ' + (j.error || 'Unknown error'));
            }
        } catch (err) {
            alert('Error creating index: ' + err.message);
        }
    });

    // Confirm index selection
    confirmIndexBtn.addEventListener('click', async () => {
        if (!selectedIndex) {
            alert('Please select an index first');
            return;
        }

        try {
            const r = await fetch('/api/selected-index', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ index: selectedIndex })
            });
            const j = await r.json();

            if (j.success) {
                // Save to cookie for persistence across pages
                document.cookie = `selectedIndex=${selectedIndex}; path=/; max-age=31536000`; // 1 year
                console.log('Saved selected index to cookie:', selectedIndex);
                
                currentSelectedIndex.textContent = selectedIndex;
                // Redirect to main page after successful selection
                window.location.href = 'index.html';
            } else {
                alert('Failed to set selected index: ' + (j.error || 'Unknown error'));
            }
        } catch (err) {
            alert('Error setting selected index: ' + err.message);
        }
    });

    // Load current selected index
    async function loadSelectedIndex() {
        try {
            // First try cookie
            const cookieIndex = getCookie('selectedIndex');
            
            const r = await fetch('/api/selected-index');
            const j = await r.json();
            
            const indexToUse = j.selectedIndex || cookieIndex;
            
            if (indexToUse) {
                currentSelectedIndex.textContent = indexToUse;
                
                // Highlight the selected index in the list
                setTimeout(() => {
                    Array.from(indicesList.children).forEach(ch => {
                        const indexName = ch.querySelector('span:last-child')?.textContent;
                        if (indexName === indexToUse) {
                            ch.style.background = 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)';
                            ch.querySelector('span:last-child').style.color = '#1e40af';
                            ch.querySelector('span:last-child').style.fontWeight = '600';
                            ch.dataset.selected = 'true';
                            const btn = ch.querySelector('.delete-index-btn');
                            if (btn) btn.style.display = 'block';
                        }
                    });
                }, 100);
            }
        } catch (err) {
            console.warn('Could not load selected index:', err);
            // Fallback to cookie
            const cookieIndex = getCookie('selectedIndex');
            if (cookieIndex) {
                currentSelectedIndex.textContent = cookieIndex;
            }
        }
    }

    // Initialize
    fetchIndices();
    loadSelectedIndex();
});

    // SEARCH ALL INDEXES CONFIGURATION
    const searchAllIndexesCheckbox = document.getElementById('searchAllIndexes');

    // Load saved setting
    const savedSearchAll = localStorage.getItem('searchAllIndexes');
    if (savedSearchAll === 'true') {
        searchAllIndexesCheckbox.checked = true;
    }

    // Save setting on change
    searchAllIndexesCheckbox.addEventListener('change', (e) => {
        localStorage.setItem('searchAllIndexes', e.target.checked);
        // Show validation
        const originalText = e.target.parentElement.querySelector('span').textContent;
        e.target.parentElement.querySelector('span').textContent = originalText + ' (Saved!)';
        setTimeout(() => {
            e.target.parentElement.querySelector('span').textContent = originalText;
        }, 1500);
    });


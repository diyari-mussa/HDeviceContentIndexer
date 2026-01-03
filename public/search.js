document.addEventListener("DOMContentLoaded", () => {
    // Search functionality
    const searchInput = document.getElementById("searchInput");
    const searchBtn = document.getElementById("searchBtn");
    const searchResults = document.getElementById("searchResults");
    const searchVariations = document.getElementById("searchVariations");
    const resultCount = document.getElementById("resultCount");
    const resultsContainer = document.getElementById("resultsContainer");
    const advancedSearchToggle = document.getElementById("advancedSearchToggle");
    const advancedSearchInfo = document.getElementById("advancedSearchInfo");
    const statisticsDashboard = document.getElementById("statisticsDashboard");
    const statsContainer = document.getElementById("statsContainer");
    const refreshStatsBtn = document.getElementById("refreshStatsBtn");
    
    // Load statistics on page load
    loadStatistics();
    
    // Refresh button handler
    if (refreshStatsBtn) {
        refreshStatsBtn.addEventListener('click', loadStatistics);
    }
    
    // Show/hide advanced search info
    if (advancedSearchToggle && advancedSearchInfo) {
        advancedSearchToggle.addEventListener('change', () => {
            advancedSearchInfo.style.display = advancedSearchToggle.checked ? 'block' : 'none';
        });
    }

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
            const advancedSearch = advancedSearchToggle ? advancedSearchToggle.checked : false;
            
            const r = await fetch('/api/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, advancedSearch })
            });
            const j = await r.json();

            if (!j.success) throw new Error(j.error || 'Search failed');

            displaySearchResults(j.results, j.total, j.query, j.variations);
        } catch (err) {
            console.error('Search error:', err);
            resultsContainer.innerHTML = `<div style="color:crimson; padding:20px;">Error: ${err.message}</div>`;
        } finally {
            searchBtn.disabled = false;
            searchBtn.textContent = 'Search All Indexes';
        }
    }

    function displaySearchResults(results, total, query, variations) {
        // Hide statistics dashboard when showing search results
        if (statisticsDashboard) statisticsDashboard.style.display = 'none';
        
        searchResults.style.display = 'block';
        resultCount.textContent = total;

        // Display variations if available
        if (searchVariations) {
            if (variations && variations.length > 0) {
                searchVariations.style.display = 'block';
                searchVariations.innerHTML = `
                    <div style="font-weight:600; color:#0369a1; margin-bottom:8px;">ℹ️ Searching for phone number variations:</div>
                    <div style="display:flex; flex-wrap:wrap; gap:8px;">
                        ${variations.map(v => `<span style="background:white; padding:4px 8px; border-radius:4px; border:1px solid #bae6fd; color:#0284c7; font-family:monospace;">${v}</span>`).join('')}
                    </div>
                `;
            } else {
                searchVariations.style.display = 'none';
            }
        }

        if (total === 0) {
            resultsContainer.innerHTML = '<div style="text-align:center; padding:40px; color:#64748b;"><div style="font-size:64px; margin-bottom:16px;">🔍</div><div style="font-size:1.2rem; font-weight:600; margin-bottom:8px;">No results found</div><div>Try different keywords or check your spelling</div></div>';
            return;
        }

        resultsContainer.innerHTML = '';

        results.forEach((result, index) => {
            const resultDiv = document.createElement('div');
            resultDiv.style.cssText = `
                border: 2px solid #e2e8f0;
                border-radius: 12px;
                margin: 16px 0;
                padding: 0;
                background: white;
                transition: all 0.3s;
                overflow: hidden;
            `;
            
            resultDiv.addEventListener('mouseenter', () => {
                resultDiv.style.borderColor = '#3b82f6';
                resultDiv.style.boxShadow = '0 8px 16px -4px rgba(59, 130, 246, 0.2)';
                resultDiv.style.transform = 'translateY(-2px)';
            });
            
            resultDiv.addEventListener('mouseleave', () => {
                resultDiv.style.borderColor = '#e2e8f0';
                resultDiv.style.boxShadow = 'none';
                resultDiv.style.transform = 'translateY(0)';
            });

            // Header with score and index
            const header = document.createElement('div');
            header.style.cssText = `
                background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                padding: 14px 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            `;
            header.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="background: rgba(255,255,255,0.2); color: white; padding: 4px 12px; border-radius: 6px; font-weight: 700; font-size: 0.85rem;">
                        #${index + 1}
                    </span>
                    <span style="color: white; font-weight: 600; font-size: 0.95rem;">
                        📄 ${escapeHtml(result.source.file_name)}
                    </span>
                </div>
                <span style="background: rgba(255,255,255,0.2); color: white; padding: 6px 12px; border-radius: 6px; font-size: 0.85rem; font-weight: 600;">
                    ⭐ ${result.score.toFixed(2)}
                </span>
            `;
            resultDiv.appendChild(header);

            // Metadata section
            const metaSection = document.createElement('div');
            metaSection.style.cssText = `
                padding: 12px 20px;
                background: #f8fafc;
                border-bottom: 1px solid #e2e8f0;
                display: flex;
                gap: 20px;
                flex-wrap: wrap;
                font-size: 0.85rem;
            `;
            
            const deviceId = escapeHtml(result.source.device_id || 'Unknown');
            const subdirectory = result.source.subdirectory ? escapeHtml(result.source.subdirectory) : 'Root';
            const timestamp = new Date(result.source.timestamp).toLocaleString();
            
            metaSection.innerHTML = `
                <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="color: #64748b;">📱</span>
                    <span style="color: #475569; font-weight: 600;">Device:</span>
                    <span style="color: #1e293b;">${deviceId}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="color: #64748b;">📁</span>
                    <span style="color: #475569; font-weight: 600;">Folder:</span>
                    <span style="color: #1e293b;">${subdirectory}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="color: #64748b;">🕒</span>
                    <span style="color: #475569; font-weight: 600;">Indexed:</span>
                    <span style="color: #1e293b;">${timestamp}</span>
                </div>
            `;
            resultDiv.appendChild(metaSection);

            // Check if this is an HTML file
            const isHtmlFile = result.source.file_name && 
                               (result.source.file_name.toLowerCase().endsWith('.html') || 
                                result.source.file_name.toLowerCase().endsWith('.htm'));
            
            // Create toggle buttons for HTML files
            if (isHtmlFile && result.source.html_content) {
                const toggleContainer = document.createElement('div');
                toggleContainer.style.cssText = `
                    display: flex;
                    gap: 8px;
                    padding: 12px 20px;
                    background: #f8fafc;
                    border-bottom: 1px solid #e2e8f0;
                `;
                
                const textBtn = document.createElement('button');
                textBtn.textContent = '📝 Text View';
                textBtn.style.cssText = `
                    padding: 8px 16px;
                    border: 2px solid #3b82f6;
                    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                    color: white;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 0.875rem;
                    transition: all 0.2s;
                `;
                
                const htmlBtn = document.createElement('button');
                htmlBtn.textContent = '🌐 HTML View';
                htmlBtn.style.cssText = `
                    padding: 8px 16px;
                    border: 2px solid #e2e8f0;
                    background: white;
                    color: #64748b;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 0.875rem;
                    transition: all 0.2s;
                `;
                
                toggleContainer.appendChild(textBtn);
                toggleContainer.appendChild(htmlBtn);
                resultDiv.appendChild(toggleContainer);
                
                // Content container
                const contentDiv = document.createElement('div');
                contentDiv.style.cssText = `
                    padding: 20px;
                    line-height: 1.7;
                    color: #1e293b;
                `;
                
                // Get text content
                let textContent = '';
                let hasHighlight = false;
                
                if (result.highlight) {
                    if (result.highlight.extracted_text && result.highlight.extracted_text.length > 0) {
                        textContent = result.highlight.extracted_text.join(' ... ');
                        hasHighlight = true;
                    } else if (result.highlight.html_content && result.highlight.html_content.length > 0) {
                        textContent = result.highlight.html_content.join(' ... ');
                        hasHighlight = true;
                    }
                }
                
                if (!hasHighlight) {
                    const fullText = result.source.extracted_text || stripHtmlTags(result.source.html_content) || 'No content available';
                    textContent = createExcerpt(fullText, query, 400);
                }
                
                // Text view content (with highlights)
                const textViewDiv = document.createElement('div');
                textViewDiv.style.cssText = `
                    max-height: 300px;
                    overflow-y: auto;
                `;
                const processedContent = processHighlights(textContent, query, hasHighlight);
                textViewDiv.innerHTML = processedContent;
                contentDiv.appendChild(textViewDiv);
                
                // HTML rendered view (initially hidden)
                const htmlViewDiv = document.createElement('div');
                htmlViewDiv.style.cssText = `
                    max-height: 500px;
                    overflow-y: auto;
                    display: none;
                    border: 2px solid #e2e8f0;
                    border-radius: 8px;
                    background: white;
                    padding: 16px;
                `;
                
                const htmlContent = result.source.html_content || '';
                htmlViewDiv.innerHTML = htmlContent;
                highlightInElement(htmlViewDiv, query);
                contentDiv.appendChild(htmlViewDiv);
                
                resultDiv.appendChild(contentDiv);
                
                // Toggle functionality
                textBtn.addEventListener('click', () => {
                    textViewDiv.style.display = 'block';
                    htmlViewDiv.style.display = 'none';
                    textBtn.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
                    textBtn.style.color = 'white';
                    textBtn.style.borderColor = '#3b82f6';
                    htmlBtn.style.background = 'white';
                    htmlBtn.style.color = '#64748b';
                    htmlBtn.style.borderColor = '#e2e8f0';
                });
                
                htmlBtn.addEventListener('click', () => {
                    textViewDiv.style.display = 'none';
                    htmlViewDiv.style.display = 'block';
                    htmlBtn.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
                    htmlBtn.style.color = 'white';
                    htmlBtn.style.borderColor = '#3b82f6';
                    textBtn.style.background = 'white';
                    textBtn.style.color = '#64748b';
                    textBtn.style.borderColor = '#e2e8f0';
                });
            } else {
                // Non-HTML files: just show text
                const contentDiv = document.createElement('div');
                contentDiv.style.cssText = `
                    padding: 20px;
                    max-height: 300px;
                    overflow-y: auto;
                    line-height: 1.7;
                    color: #1e293b;
                `;
                
                let textContent = '';
                let hasHighlight = false;
                
                if (result.highlight) {
                    if (result.highlight.extracted_text && result.highlight.extracted_text.length > 0) {
                        textContent = result.highlight.extracted_text.join(' ... ');
                        hasHighlight = true;
                    } else if (result.highlight.html_content && result.highlight.html_content.length > 0) {
                        textContent = result.highlight.html_content.join(' ... ');
                        hasHighlight = true;
                    }
                }
                
                if (!hasHighlight) {
                    const fullText = result.source.extracted_text || stripHtmlTags(result.source.html_content) || 'No content available';
                    textContent = createExcerpt(fullText, query, 400);
                }
                
                const processedContent = processHighlights(textContent, query, hasHighlight);
                contentDiv.innerHTML = processedContent;
                resultDiv.appendChild(contentDiv);
            }

            resultsContainer.appendChild(resultDiv);
        });
    }

    // Helper function to highlight search terms in rendered HTML
    function highlightInElement(element, searchTerm) {
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        
        const nodesToReplace = [];
        let node;
        
        while (node = walker.nextNode()) {
            if (node.nodeValue.toLowerCase().includes(searchTerm.toLowerCase())) {
                nodesToReplace.push(node);
            }
        }
        
        nodesToReplace.forEach(node => {
            const span = document.createElement('span');
            const regex = new RegExp(`(${escapeRegex(searchTerm)})`, 'gi');
            span.innerHTML = escapeHtml(node.nodeValue).replace(
                regex, 
                '<mark style="background: linear-gradient(135deg, #fef08a 0%, #fde047 100%); padding: 2px 4px; border-radius: 3px; font-weight: 600; color: #854d0e;">$1</mark>'
            );
            node.parentNode.replaceChild(span, node);
        });
    }

    // Helper function to escape HTML
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Helper function to strip HTML tags
    function stripHtmlTags(html) {
        const div = document.createElement('div');
        div.innerHTML = html;
        return div.textContent || div.innerText || '';
    }

    // Helper function to create excerpt around search term
    function createExcerpt(text, searchTerm, maxLength = 400) {
        if (!text) return 'No content available';
        
        const lowerText = text.toLowerCase();
        const lowerTerm = searchTerm.toLowerCase();
        const index = lowerText.indexOf(lowerTerm);
        
        if (index === -1) {
            // Search term not found, return beginning
            return text.substring(0, maxLength) + (text.length > maxLength ? '...' : '');
        }
        
        // Calculate excerpt bounds with context
        const contextSize = Math.floor(maxLength / 2);
        let start = Math.max(0, index - contextSize);
        let end = Math.min(text.length, index + searchTerm.length + contextSize);
        
        // Adjust to word boundaries
        if (start > 0) {
            const spaceIndex = text.lastIndexOf(' ', start);
            if (spaceIndex > 0 && spaceIndex > start - 50) {
                start = spaceIndex + 1;
            }
        }
        
        if (end < text.length) {
            const spaceIndex = text.indexOf(' ', end);
            if (spaceIndex > 0 && spaceIndex < end + 50) {
                end = spaceIndex;
            }
        }
        
        const prefix = start > 0 ? '...' : '';
        const suffix = end < text.length ? '...' : '';
        
        return prefix + text.substring(start, end) + suffix;
    }

    // Helper function to process and highlight text
    function processHighlights(text, query, hasElasticHighlight) {
        if (!text) return '<div style="color: #94a3b8; font-style: italic;">No content available</div>';
        
        // If Elasticsearch provided highlights with <em> tags, convert them to our styling
        if (hasElasticHighlight) {
            text = text.replace(/<em>/gi, '<mark style="background: linear-gradient(135deg, #fef08a 0%, #fde047 100%); padding: 2px 4px; border-radius: 3px; font-weight: 600; color: #854d0e;">');
            text = text.replace(/<\/em>/gi, '</mark>');
        } else {
            // Manual highlighting
            const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
            text = escapeHtml(text).replace(regex, '<mark style="background: linear-gradient(135deg, #fef08a 0%, #fde047 100%); padding: 2px 4px; border-radius: 3px; font-weight: 600; color: #854d0e;">$1</mark>');
        }
        
        return `<div style="white-space: pre-wrap; word-wrap: break-word;">${text}</div>`;
    }

    // Helper function to escape regex special characters
    function escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    // Load statistics function
    async function loadStatistics() {
        if (!statsContainer) return;
        
        statsContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: #64748b; grid-column: 1 / -1;">Loading statistics...</div>';
        
        try {
            const response = await fetch('/api/statistics');
            const data = await response.json();
            
            if (!data.success) throw new Error(data.error || 'Failed to load statistics');
            
            displayStatistics(data.stats);
        } catch (error) {
            console.error('Error loading statistics:', error);
            statsContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: #ef4444; grid-column: 1 / -1;">⚠️ Failed to load statistics</div>';
        }
    }
    
    function displayStatistics(stats) {
        statsContainer.innerHTML = '';
        
        // Total Documents Card
        const docsCard = createStatCard(
            '📄',
            'Total Documents',
            stats.totalDocuments?.toLocaleString() || '0',
            '#3b82f6'
        );
        statsContainer.appendChild(docsCard);
        
        // Total Devices Card
        const devicesCard = createStatCard(
            '📱',
            'Total Devices',
            stats.totalDevices?.toLocaleString() || '0',
            '#10b981'
        );
        statsContainer.appendChild(devicesCard);
        
        // Total Indexes Card
        const indexesCard = createStatCard(
            '🗂️',
            'Total Indexes',
            stats.totalIndexes?.toLocaleString() || '0',
            '#f59e0b'
        );
        statsContainer.appendChild(indexesCard);
        
        // Storage Size Card
        const storageCard = createStatCard(
            '💾',
            'Total Storage',
            formatBytes(stats.totalStorageBytes || 0),
            '#8b5cf6'
        );
        statsContainer.appendChild(storageCard);
        
        // Recent Activity Card
        if (stats.recentDocuments && stats.recentDocuments.length > 0) {
            const activityCard = document.createElement('div');
            activityCard.style.cssText = `
                background: white;
                border: 2px solid #e2e8f0;
                border-radius: 12px;
                padding: 20px;
                grid-column: 1 / -1;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            `;
            
            activityCard.innerHTML = `
                <h4 style="margin: 0 0 16px 0; color: #475569; display: flex; align-items: center; gap: 8px;">
                    <span>🕒</span> Recent Activity
                </h4>
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    ${stats.recentDocuments.slice(0, 5).map(doc => `
                        <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #3b82f6;">
                            <span style="font-size: 1.5rem;">📄</span>
                            <div style="flex: 1; min-width: 0;">
                                <div style="font-weight: 600; color: #1e293b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(doc.file_name || 'Unknown')}</div>
                                <div style="font-size: 0.85rem; color: #64748b;">Device: ${escapeHtml(doc.device_id || 'Unknown')} • ${new Date(doc.timestamp).toLocaleDateString()}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            
            statsContainer.appendChild(activityCard);
        }
        
        // Top Devices Card
        if (stats.topDevices && stats.topDevices.length > 0) {
            const topDevicesCard = document.createElement('div');
            topDevicesCard.style.cssText = `
                background: white;
                border: 2px solid #e2e8f0;
                border-radius: 12px;
                padding: 20px;
                grid-column: 1 / -1;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            `;
            
            topDevicesCard.innerHTML = `
                <h4 style="margin: 0 0 16px 0; color: #475569; display: flex; align-items: center; gap: 8px;">
                    <span>📱</span> Top Devices by Document Count
                </h4>
                <div style="display: grid; gap: 8px;">
                    ${stats.topDevices.slice(0, 5).map((device, index) => {
                        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];
                        const color = colors[index % colors.length];
                        return `
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <div style="min-width: 30px; text-align: center; font-weight: 700; color: ${color};">#${index + 1}</div>
                                <div style="flex: 1; background: #f8fafc; padding: 10px 16px; border-radius: 8px; border-left: 4px solid ${color};">
                                    <div style="font-weight: 600; color: #1e293b;">${escapeHtml(device.device_id)}</div>
                                    <div style="font-size: 0.85rem; color: #64748b;">${device.doc_count.toLocaleString()} documents</div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
            
            statsContainer.appendChild(topDevicesCard);
        }
    }
    
    function createStatCard(icon, label, value, color) {
        const card = document.createElement('div');
        card.style.cssText = `
            background: linear-gradient(135deg, ${color} 0%, ${color}dd 100%);
            color: white;
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
            transition: transform 0.2s;
        `;
        
        card.innerHTML = `
            <div style="font-size: 2.5rem; margin-bottom: 8px;">${icon}</div>
            <div style="font-size: 0.9rem; opacity: 0.9; margin-bottom: 4px;">${label}</div>
            <div style="font-size: 2rem; font-weight: 700;">${value}</div>
        `;
        
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-4px)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
        });
        
        return card;
    }
    
    function formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
});
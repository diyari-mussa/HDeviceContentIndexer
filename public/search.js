document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const mobileInput = document.getElementById('mobileInput');
    const mobileSearchBtn = document.getElementById('mobileSearchBtn');
    const mobileDisplay = document.getElementById('mobileDisplay');
    
    // Containers
    const searchResults = document.getElementById('searchResults');
    const resultsContainer = document.getElementById('resultsContainerContent');
    const resultCount = document.getElementById('resultCount');
    const searchVariations = document.getElementById('searchVariations');
    const statisticsDashboard = document.getElementById('statisticsDashboard');
    const statsContainer = document.getElementById('statsContainer');
    const refreshStatsBtn = document.getElementById('refreshStatsBtn');
    
    // Toggles
    const advancedSearchToggle = document.getElementById('advancedSearchToggle');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const generalView = document.getElementById('generalSearchAuth');
    const mobileView = document.getElementById('mobileSearchAuth');

    let currentMode = 'general'; // general | mobile
    let currentPage = 1;
    let currentQuery = '';
    let currentTotalPages = 0;
    let currentTotal = 0;

    // Get page size from settings (default 20)
    function getPageSize() {
        return parseInt(localStorage.getItem('resultsPerPage')) || 20;
    }

    // Tab Switching Logic
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const tab = btn.dataset.tab;
            currentMode = tab;
            
            if (tab === 'general') {
                generalView.style.display = 'block';
                mobileView.style.display = 'none';
                if (searchInput) searchInput.focus();
            } else {
                generalView.style.display = 'none';
                mobileView.style.display = 'block';
                if (mobileInput) mobileInput.focus();
            }
        });
    });

    // Mobile Input Visual Feedback
    if (mobileInput) {
        mobileInput.addEventListener('input', (e) => {
            const val = e.target.value;
            mobileDisplay.textContent = val || 'Ready.';
            mobileDisplay.style.color = val ? '#64ffda' : '#64ffda';
            mobileDisplay.style.textShadow = val ? '0 0 10px rgba(100,255,218,0.5)' : 'none';
        });
        
        mobileInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch('mobile');
        });
    }

    // Event Listeners
    if (searchBtn) searchBtn.addEventListener('click', () => performSearch('general'));
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch('general');
        });
    }
    
    if (mobileSearchBtn) mobileSearchBtn.addEventListener('click', () => performSearch('mobile'));
    if (refreshStatsBtn) refreshStatsBtn.addEventListener('click', loadStatistics);

    // Initial Load
    loadStatistics();

    // Check Advanced Toggle URL Param
    const urlParams = new URLSearchParams(window.location.search);
    if (advancedSearchToggle && urlParams.get('advanced') === 'true') {
        advancedSearchToggle.checked = true;
    }

    // SEARCH FUNCTION
    async function performSearch(mode, page = 1) {
        const query = mode === 'mobile' ? mobileInput.value.trim() : searchInput.value.trim();
        
        if (!query) return;

        currentMode = mode;
        currentQuery = query;
        currentPage = page;

        // UI Feedback
        const btn = mode === 'mobile' ? mobileSearchBtn : searchBtn;
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'SEARCHING...';
        
        if (resultsContainer) {
            resultsContainer.innerHTML = '<div class="loader"></div> Searching indices...';
            searchResults.style.display = 'block';
            statisticsDashboard.style.display = 'none';
        }

        try {
            // Check settings
            const searchAll = localStorage.getItem('searchAllIndexes') === 'true';
            const pageSize = getPageSize();
            
            // Build Payload
            const payload = {
                query,
                advancedSearch: mode === 'general' ? (advancedSearchToggle ? advancedSearchToggle.checked : false) : false,
                mobileSearch: mode === 'mobile',
                searchAllIndexes: searchAll,
                page: page,
                pageSize: pageSize
            };
            
            const r = await fetch('/api/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            const j = await r.json();
            
            if (!j.success) throw new Error(j.error || 'Server error');

            currentTotalPages = j.totalPages || 1;
            currentTotal = j.total;
            
            displaySearchResults(j.results, j.total, j.query, j.variations, j.page, j.totalPages, j.pageSize);
            
        } catch (err) {
            console.error('Search failed:', err);
            if (resultsContainer) {
                resultsContainer.innerHTML = `<div class="status-badge status-error">Error: ${err.message}</div>`;
            }
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }

    function displaySearchResults(results, total, query, variations, page, totalPages, pageSize) {
        if (resultCount) resultCount.textContent = total;
        
        // Show variations (Mobile Search)
        if (searchVariations) {
            if (variations && variations.length > 0) {
                searchVariations.style.display = 'block';
                searchVariations.innerHTML = `
                    <strong style="color:var(--primary-cyan)">ℹ️ Searching variations:</strong> 
                    ${variations.map(v => `<code style="background:rgba(255,255,255,0.1); padding:2px 5px; margin:0 2px;">${v}</code>`).join('')}
                `;
            } else {
                searchVariations.style.display = 'none';
            }
        }

        if (total === 0) {
            resultsContainer.innerHTML = '<div style="text-align:center; padding:30px; opacity:0.7;">No results found.</div>';
            return;
        }

        resultsContainer.innerHTML = '';

        // Page info header
        const startItem = (page - 1) * pageSize + 1;
        const endItem = Math.min(page * pageSize, total);
        const pageInfo = document.createElement('div');
        pageInfo.style.cssText = 'text-align:center; padding:10px; margin-bottom:15px; color:var(--text-secondary); font-size:0.9rem; border-bottom:1px solid var(--border-color);';
        pageInfo.innerHTML = `Showing <strong style="color:var(--primary-cyan)">${startItem}-${endItem}</strong> of <strong style="color:var(--primary-cyan)">${total}</strong> results (Page ${page} of ${totalPages})`;
        resultsContainer.appendChild(pageInfo);

        results.forEach((res, idx) => {
            const div = document.createElement('div');
            div.className = 'result-item'; // Uses our new CSS
            
            const source = res.source;
            const score = res.score ? res.score.toFixed(2) : 'N/A';
            const fileName = escapeHtml(source.file_name || 'Unknown');
            const deviceId = escapeHtml(source.device_id || 'Unknown');
            const folder = escapeHtml(source.subdirectory || '/');
            const fullPath = escapeHtml(source.full_path || '');
            const date = source.timestamp ? new Date(source.timestamp).toLocaleString() : 'Unknown date';
            const indexName = res.index || 'unknown-index';
            
            // Highlight Content
            const contentHighlight = processHighlights(res.highlight || source.extracted_text, query, !!res.highlight);
            
            div.innerHTML = `
                <a href="#" class="result-title">📄 ${fileName}</a>
                <div class="result-meta">
                    <span>📱 ${deviceId}</span>
                    <span>📂 ${folder}</span>
                    <span>📅 ${date}</span>
                    <span style="color:var(--accent-blue)">🗂️ ${indexName}</span>
                    <span class="status-badge status-success">Score: ${score}</span>
                </div>
                ${fullPath ? `<div class="result-path" style="margin:6px 0; padding:6px 10px; background:rgba(100,255,218,0.05); border:1px solid var(--border-color); border-radius:4px; font-family:'Consolas',monospace; font-size:0.8rem; color:var(--text-secondary); word-break:break-all;">📁 ${fullPath}</div>` : ''}
                <div class="result-snippet">
                    ${contentHighlight}
                </div>
            `;
            
            resultsContainer.appendChild(div);
        });

        // Pagination controls
        if (totalPages > 1) {
            const paginationDiv = document.createElement('div');
            paginationDiv.style.cssText = 'display:flex; justify-content:center; align-items:center; gap:8px; padding:20px 0; margin-top:15px; border-top:1px solid var(--border-color); flex-wrap:wrap;';

            // Previous button
            const prevBtn = document.createElement('button');
            prevBtn.className = 'btn';
            prevBtn.textContent = '← Previous';
            prevBtn.disabled = page <= 1;
            prevBtn.style.cssText = 'padding:8px 16px; cursor:pointer; border-radius:4px; border:1px solid var(--border-color); background:var(--bg-dark); color:var(--text-primary); font-size:0.9rem;';
            if (page <= 1) prevBtn.style.opacity = '0.4';
            prevBtn.addEventListener('click', () => performSearch(currentMode, page - 1));
            paginationDiv.appendChild(prevBtn);

            // Page number buttons
            const maxButtons = 7;
            let startPage = Math.max(1, page - Math.floor(maxButtons / 2));
            let endPage = Math.min(totalPages, startPage + maxButtons - 1);
            if (endPage - startPage + 1 < maxButtons) {
                startPage = Math.max(1, endPage - maxButtons + 1);
            }

            if (startPage > 1) {
                const firstBtn = createPageBtn(1, page);
                paginationDiv.appendChild(firstBtn);
                if (startPage > 2) {
                    const dots = document.createElement('span');
                    dots.textContent = '...';
                    dots.style.cssText = 'color:var(--text-secondary); padding:0 4px;';
                    paginationDiv.appendChild(dots);
                }
            }

            for (let i = startPage; i <= endPage; i++) {
                const pageBtn = createPageBtn(i, page);
                paginationDiv.appendChild(pageBtn);
            }

            if (endPage < totalPages) {
                if (endPage < totalPages - 1) {
                    const dots = document.createElement('span');
                    dots.textContent = '...';
                    dots.style.cssText = 'color:var(--text-secondary); padding:0 4px;';
                    paginationDiv.appendChild(dots);
                }
                const lastBtn = createPageBtn(totalPages, page);
                paginationDiv.appendChild(lastBtn);
            }

            // Next button
            const nextBtn = document.createElement('button');
            nextBtn.className = 'btn';
            nextBtn.textContent = 'Next →';
            nextBtn.disabled = page >= totalPages;
            nextBtn.style.cssText = 'padding:8px 16px; cursor:pointer; border-radius:4px; border:1px solid var(--border-color); background:var(--bg-dark); color:var(--text-primary); font-size:0.9rem;';
            if (page >= totalPages) nextBtn.style.opacity = '0.4';
            nextBtn.addEventListener('click', () => performSearch(currentMode, page + 1));
            paginationDiv.appendChild(nextBtn);

            resultsContainer.appendChild(paginationDiv);
        }
    }

    // Helper to create page number button
    function createPageBtn(pageNum, currentPage) {
        const btn = document.createElement('button');
        btn.textContent = pageNum;
        btn.style.cssText = `padding:6px 12px; cursor:pointer; border-radius:4px; border:1px solid var(--border-color); font-size:0.9rem; min-width:36px; ${pageNum === currentPage ? 'background:var(--primary-cyan); color:var(--bg-deep); font-weight:bold; border-color:var(--primary-cyan);' : 'background:var(--bg-dark); color:var(--text-primary);'}`;
        if (pageNum !== currentPage) {
            btn.addEventListener('click', () => performSearch(currentMode, pageNum));
        }
        return btn;
    }

    // Stats Logic
    async function loadStatistics() {
        if (!statsContainer) return;
        statsContainer.innerHTML = '<div class="loader"></div> Loading stats...';
        
        try {
            const r = await fetch('/api/statistics');
            const d = await r.json();
            
            if (d.success) {
                renderStats(d.stats);
            } else {
                statsContainer.innerHTML = 'Failed to load stats';
            }
        } catch (e) {
            statsContainer.innerHTML = 'Connection error';
        }
    }

    function renderStats(stats) {
        statsContainer.innerHTML = '';
        
        const metrics = [
            { icon: '📄', label: 'Documents', value: stats.totalDocuments },
            { icon: '📱', label: 'Devices', value: stats.totalDevices },
            { icon: '🗂️', label: 'Indexes', value: stats.totalIndexes },
            { icon: '💾', label: 'Storage', value: formatBytes(stats.totalStorageBytes) }
        ];
        
        metrics.forEach(m => {
            const el = document.createElement('div');
            el.className = 'card';
            el.innerHTML = `
                <div style="font-size:2rem; margin-bottom:5px;">${m.icon}</div>
                <div style="color:var(--text-secondary); font-size:0.9rem;">${m.label}</div>
                <div style="color:var(--primary-cyan); font-size:1.5rem; font-weight:bold;">${m.value}</div>
            `;
            statsContainer.appendChild(el);
        });
    }

    // Helpers
    function escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const s = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + s[i];
    }

    function processHighlights(text, query, hasElasticHighlight) {
        if (!text) return 'No content preview';
        let display = text;
        
        if (typeof text === 'object') { 
            // Handle array of highlights
             display = Object.values(text).flat().join(' ... ');
        }
        
        if (hasElasticHighlight) {
            // ES returns <em> tags. We replace them with our highlight style
             return display.replace(/<em>/g, '<em style="background:rgba(100,255,218,0.3); color:#fff; font-style:normal; padding:2px;">').replace(/<\/em>/g, '</em>');
        }
        
        // Truncate if too long (simple approach)
        if (display.length > 500) return display.substring(0, 500) + '...';
        return display;
    }
});
// ===== START OF FILE: brushvault/js/ui/rendering.js ===== //
// --- UI Rendering Functions ---

function renderBrushLibrary(brushesToRender) {
    if (!outputDiv) return;

    const existingStatusMessages = outputDiv.querySelectorAll('p.status-message');
    outputDiv.innerHTML = '';
    existingStatusMessages.forEach(msg => outputDiv.appendChild(msg));

    if (brushesToRender.length === 0) {
        let message = "No brushes found in your library. Import some to get started!";
        if (
            (searchInput && searchInput.value.trim()) ||
            (mobileSearchInput && mobileSearchInput.value.trim()) ||
            currentViewMode !== 'all' ||
            activeBrushSetFilter ||
            activeTagFilter.size > 0
        ) {
            message = "No brushes match your current filters.";
        }
        const noBrushesP = document.createElement('p');
        noBrushesP.className = 'info-text';
        noBrushesP.textContent = message;
        outputDiv.appendChild(noBrushesP);
        return;
    }

    const fragment = document.createDocumentFragment();
    const isMobileView = window.innerWidth <= 640;

    brushesToRender.forEach(b => {
        const card = document.createElement('div');
        card.className = 'brush-card';
        card.dataset.internalId = b.internalId;
        if (selectedBrushInternalIds.has(b.internalId)) {
            card.classList.add('selected');
        }

        const thumbUrl = b.thumbnailBlob ? URL.createObjectURL(b.thumbnailBlob) : "";
        const imgTag = thumbUrl ? `<img src="${thumbUrl}" alt="Preview for ${b.name}" loading="lazy">` : '<div class="no-preview">No Preview</div>';

        const isChecked = selectedBrushInternalIds.has(b.internalId);
        const favoriteStarInName = b.isFavorite ? '<span class="favorite-star">★</span>' : '';
        
        let subtext = '';
        if (!isMobileView && b.authorName && b.authorName !== "Unknown") {
            subtext += `<div class="from-set mobile-hidden author-name">By: ${b.authorName}</div>`;
        }
        if (!isMobileView && b.isFromSet && b.setName) {
             subtext += `<div class="from-set mobile-hidden">From: ${b.setName}</div>`;
        }


        card.innerHTML = `
            <input type="checkbox" class="item-checkbox brush-select-checkbox sr-only" data-internal-id="${b.internalId}" id="checkbox-${b.internalId}" ${isChecked ? 'checked' : ''}>
            <label for="checkbox-${b.internalId}" class="brush-preview-wrapper" aria-label="Select ${b.name}">
                ${imgTag}
            </label>
            <div class="brush-card-content">
                <div class="brush-card-info">
                    <div class="name">${b.name}${favoriteStarInName}</div>
                    ${subtext}
                </div>
                <div class="brush-card-actions">
                    <button class="icon-button inspect-icon" data-action="inspect" title="Inspect brush">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M23.822 20.88l-6.353-6.354c.93-1.465 1.467-3.2 1.467-5.059 0-5.18-4.22-9.4-9.4-9.4-5.18 0-9.4 4.22-9.4 9.4s4.22 9.4 9.4 9.4c1.838 0 3.544-.524 5.04-1.443l6.353 6.354c.29.29.678.434 1.065.434s.775-.144 1.065-.434c.58-.58.58-1.543 0-2.122zM3.93 9.467c0-3.553 2.887-6.44 6.44-6.44s6.44 2.887 6.44 6.44-2.887 6.44-6.44 6.44-6.44-2.887-6.44-6.44z"/></svg>
                    </button>
                    <button class="icon-button favorite-icon ${b.isFavorite ? 'is-favorite' : ''}" data-action="toggle-favorite" title="${b.isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .587l3.668 7.568 8.332 1.151-6.064 5.828 1.48 8.279-7.416-3.967-7.417 3.967 1.481-8.279-6.064-5.828 8.332-1.151z"/></svg>
                    </button>
                    <button class="icon-button delete-icon" data-action="delete" title="Delete brush">
                         <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3 6v18h18v-18h-18zm5 14c0 .552-.448 1-1 1s-1-.448-1-1v-10c0-.552.448-1 1-1s1 .448 1 1v10zm5 0c0 .552-.448 1-1 1s-1-.448-1-1v-10c0-.552.448-1 1-1s1 .448 1 1v10zm5 0c0 .552-.448 1-1 1s-1-.448-1-1v-10c0-.552.448-1 1-1s1 .448 1 1v10zm4-18v2h-20v-2h5.711c.9 0 1.631-1.099 1.631-2h5.316c0 .901.73 2 1.631 2h5.711z"/></svg>
                    </button>
                </div>
            </div>
        `;
        card.addEventListener('click', (event) => handleCardClick(event, b.internalId));
        card.querySelector(`#checkbox-${b.internalId}`).addEventListener('change', handleBrushSelectionChange);
        card.querySelector('[data-action="inspect"]').addEventListener('click', (e) => { e.stopPropagation(); openInspector(b.internalId); });
        card.querySelector('[data-action="toggle-favorite"]').addEventListener('click', (e) => { e.stopPropagation(); handleToggleFavorite(b.internalId); });
        card.querySelector('[data-action="delete"]').addEventListener('click', (e) => { e.stopPropagation(); handleDeleteSingleBrush(b.internalId); });

        fragment.appendChild(card);
    });
    outputDiv.appendChild(fragment);
}


async function populateBrushSetsSidebar() {
    if (!brushSetsListUL) return;
    try {
        const allBrushes = await db.brushes.toArray();
        const setNames = new Set(allBrushes.filter(b => b.isFromSet && b.setName).map(b => b.setName));

        brushSetsListUL.innerHTML = ''; 

        if (setNames.size === 0) {
            const placeholderLi = document.createElement('li');
            placeholderLi.innerHTML = '<span class="no-items-placeholder">No sets imported yet</span>';
            brushSetsListUL.appendChild(placeholderLi);
        } else {
            const sortedSetNames = Array.from(setNames).sort((a,b) => a.localeCompare(b));
            sortedSetNames.forEach(setName => {
                const li = document.createElement('li');
                const container = document.createElement('div');
                container.className = 'sidebar-item-container';

                const a = document.createElement('a');
                a.href = '#';
                a.textContent = setName;
                a.className = 'sidebar-item-link';
                a.dataset.setName = setName;
                a.addEventListener('click', (e) => handleBrushSetFilterClick(e, setName));
                
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'sidebar-delete-btn';
                deleteBtn.innerHTML = '×';
                deleteBtn.title = `Delete Set: ${setName}`;
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent filter from triggering
                    handleDeleteBrushSetFromLibrary(setName);
                });

                container.appendChild(a);
                container.appendChild(deleteBtn);
                li.appendChild(container);
                brushSetsListUL.appendChild(li);
            });
        }
    } catch (error) {
        console.error("Error populating brush sets sidebar:", error);
        brushSetsListUL.innerHTML = '<li><span class="no-items-placeholder" style="color:var(--danger-color);">Error loading sets</span></li>';
    }
}

async function populateTagsSidebar() {
    if (!tagsListUL) return;
     try {
        const allBrushes = await db.brushes.toArray();
        const allTags = new Set();
        allBrushes.forEach(b => {
            if (b.tags) b.tags.forEach(tag => allTags.add(tag));
        });

        tagsListUL.innerHTML = ''; 

        // Add the "Untagged" filter button (without a delete button)
        const liUntagged = document.createElement('li');
        const untaggedBtn = document.createElement('button');
        untaggedBtn.className = 'sidebar-tag-button';
        untaggedBtn.id = 'showUntaggedFilterLink';
        untaggedBtn.textContent = "Untagged";
        untaggedBtn.dataset.tagName = 'UNTAGGED_FILTER';
        untaggedBtn.addEventListener('click', handleTagFilterClick);
        liUntagged.appendChild(untaggedBtn);
        tagsListUL.appendChild(liUntagged);

        // Add the rest of the sorted tags with delete buttons
        const sortedTags = Array.from(allTags).sort((a,b) => a.localeCompare(b));
        sortedTags.forEach(tag => {
            const li = document.createElement('li');
            const container = document.createElement('div');
            container.className = 'sidebar-item-container';

            const tagBtn = document.createElement('button');
            tagBtn.className = 'sidebar-tag-button sidebar-item-link';
            tagBtn.textContent = tag;
            tagBtn.dataset.tagName = tag;
            tagBtn.addEventListener('click', handleTagFilterClick);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'sidebar-delete-btn';
            deleteBtn.innerHTML = '×';
            deleteBtn.title = `Remove tag '${tag}' from all brushes`;
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                handleDeleteTagFromLibrary(tag);
            });

            container.appendChild(tagBtn);
            container.appendChild(deleteBtn);
            li.appendChild(container);
            tagsListUL.appendChild(li);
        });
    } catch (error) {
        console.error("Error populating tags sidebar:", error);
        tagsListUL.innerHTML = '<li><span class="no-items-placeholder" style="color:var(--danger-color);">Error loading tags</span></li>';
    }
}
// ===== END OF FILE: brushvault/js/ui/rendering.js ===== //
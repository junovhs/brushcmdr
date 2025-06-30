// --- Event Handlers for Navigation, Filtering, and Sorting ---

function handleAllBrushesFilterClick(e) {
    e.preventDefault();
    currentViewMode = 'all';
    activeBrushSetFilter = null;
    activeTagFilter.clear();
    updateActiveSidebarLink();
    loadBrushesFromDBAndRender();
    // handleSidebarLinkClick(); // REMOVED - This was causing state conflicts
}

function handleFavoritesFilterClick(e) {
    e.preventDefault();
    currentViewMode = 'favorites';
    activeBrushSetFilter = null;
    activeTagFilter.clear();
    updateActiveSidebarLink();
    loadBrushesFromDBAndRender();
    // handleSidebarLinkClick(); // REMOVED
}

function handleBrushSetFilterClick(e, setName) {
    e.preventDefault();
    currentViewMode = 'set';
    activeBrushSetFilter = setName;
    activeTagFilter.clear();
    updateActiveSidebarLink();
    loadBrushesFromDBAndRender();
    // handleSidebarLinkClick(); // REMOVED
}

function handleTagFilterClick(e) {
    e.preventDefault();
    const clickedTag = e.target.dataset.tagName;
    if (!clickedTag) return;

    currentViewMode = 'tag';
    activeBrushSetFilter = null;

    if (clickedTag === 'UNTAGGED_FILTER') {
        if (activeTagFilter.has(clickedTag)) {
            activeTagFilter.clear();
        } else {
            activeTagFilter.clear();
            activeTagFilter.add(clickedTag);
        }
    } else {
        if (activeTagFilter.has('UNTAGGED_FILTER')) {
            activeTagFilter.clear();
        }
        if (activeTagFilter.has(clickedTag)) {
            activeTagFilter.delete(clickedTag);
        } else {
            activeTagFilter.add(clickedTag);
        }
    }

    if (activeTagFilter.size === 0) {
        currentViewMode = 'all';
    }

    updateActiveSidebarLink();
    loadBrushesFromDBAndRender();
    // handleSidebarLinkClick(); // REMOVED
}

function handleSearchInputChange() {
    loadBrushesFromDBAndRender();
}

function handleSortSelectChange() {
    loadBrushesFromDBAndRender();
}
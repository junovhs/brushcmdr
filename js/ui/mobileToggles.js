// --- UI Functions for Toggling Mobile-Specific Elements ---

function toggleMobileSidebar(forceOpen = null) {
    if (!sidebar || !pageOverlay || !mobileNavToggle) return;
    const isOpen = sidebar.classList.contains('open');

    if (forceOpen === true || (forceOpen === null && !isOpen)) {
        sidebar.classList.add('open');
        pageOverlay.classList.add('active');
        mobileNavToggle.innerHTML = '<span class="icon-close">✕</span>';
    } else if (forceOpen === false || (forceOpen === null && isOpen)) {
        sidebar.classList.remove('open');
        // Only hide overlay if no other modal is using it
        if ((!helpModal || helpModal.style.display === 'none') && (!mobileSortOptions || !mobileSortOptions.classList.contains('active'))) {
            pageOverlay.classList.remove('active');
        }
        mobileNavToggle.innerHTML = '<span class="icon-menu">☰</span>';
    }
}

function toggleMobileSearch(forceOpen = null) {
    if (!mobileSearchBar) return; 
    const isActive = mobileSearchBar.classList.contains('active');

    if (forceOpen === true || (forceOpen === null && !isActive)) {
        mobileSearchBar.classList.add('active');
        mobileSearchBar.style.display = 'block'; // Ensure it's visible
    } else if (forceOpen === false || (forceOpen === null && isActive)) {
        mobileSearchBar.classList.remove('active');
        mobileSearchBar.style.display = 'none'; // Ensure it's hidden
    }
}

function toggleMobileSort(forceOpen = null) {
    if (!mobileSortOptions || !sortSelect) return;
    const isActive = mobileSortOptions.classList.contains('active');

    if (forceOpen === true || (forceOpen === null && !isActive)) {
        mobileSortOptions.classList.add('active');
        pageOverlay.classList.add('active');
        // Highlight the currently active sort option
        const currentSortValue = sortSelect.value;
        mobileSortOptions.querySelectorAll('button').forEach(btn => {
            btn.classList.toggle('active-sort', btn.dataset.sort === currentSortValue);
        });
    } else if (forceOpen === false || (forceOpen === null && isActive)) {
        mobileSortOptions.classList.remove('active');
        // Only hide overlay if no other modal is using it
        if ((!sidebar || !sidebar.classList.contains('open')) && (!helpModal || helpModal.style.display === 'none')) {
            pageOverlay.classList.remove('active');
        }
    }
}

function updateMobileSortUI(sortValue) {
    if (mobileSortOptions) {
        mobileSortOptions.querySelectorAll('button').forEach(btn => {
            btn.classList.toggle('active-sort', btn.dataset.sort === sortValue);
        });
    }
    // Also ensure the main (desktop) select is in sync
    if(sortSelect) sortSelect.value = sortValue;
}
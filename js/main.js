// --- Main Application Entry Point ---

document.addEventListener('DOMContentLoaded', async () => {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js', { scope: './' })
            .then(registration => {
                console.log('Service Worker registered with scope:', registration.scope);
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (newWorker) {
                        console.log('[Service Worker] Update found, new worker installing.');
                        newWorker.addEventListener('statechange', () => {
                            console.log('[Service Worker] New worker state:', newWorker.state);
                            if (newWorker.state === 'installed') {
                                if (navigator.serviceWorker.controller) {
                                    console.log('[Service Worker] New content is available, please refresh.');
                                    let confirmRefresh = confirm("A new version of Brush Commander Beta is available. Refresh to update?"); // NAME CHANGE
                                    if (confirmRefresh) {
                                        newWorker.postMessage({ action: 'skipWaiting' });
                                    }
                                } else {
                                    console.log('[Service Worker] Content cached for offline use.');
                                }
                            }
                        });
                    }
                });
                let refreshing;
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    if (refreshing) return;
                    console.log('[Service Worker] Controller changed, reloading page.');
                    window.location.reload();
                    refreshing = true;
                });

            })
            .catch(error => {
                console.error('Service Worker registration failed:', error);
            });
    }


    if (typeof window.bplistParserManual?.parseBuffer !== 'function') {
        updateStatus("CRITICAL ERROR: bplistParser library did not load. Brush import will fail.", true);
        return;
    }
    if (typeof Dexie === 'undefined') {
        updateStatus("CRITICAL ERROR: Dexie.js (database library) did not load. Application will not work.", true);
        return;
    }


    try {
        await db.open();
        console.log(`Database opened successfully. Schema version: ${db.verno}`);
        if (typeof db.export !== 'function' || typeof db.import !== 'function') {
            console.warn("DexieExportImport methods not found on db instance. Advanced database operations might be unavailable.");
        } else {
            console.log("Dexie-Export-Import addon successfully initialized on db instance.");
        }
    } catch (error) {
        console.error("FATAL: Failed to open Dexie database:", error);
        updateStatus(`CRITICAL DATABASE ERROR: ${error.message}. Please clear site data or contact support.`, true);
        return;
    }

    initPWA();
    initDemoModeFeatures(); 
    createHeaderActionButtons(); 

    resetUIStates(); 

    // --- Attach Event Listeners ---

    if (fileInput) fileInput.addEventListener('change', handleFileInputChange);

    if (allBrushesLink) allBrushesLink.addEventListener('click', handleAllBrushesFilterClick);
    if (favoritesLink) favoritesLink.addEventListener('click', handleFavoritesFilterClick);
    if (clearDbButton) clearDbButton.addEventListener('click', handleClearDbButtonClick);


    if (searchInput) searchInput.addEventListener('input', handleSearchInputChange);
    if (sortSelect) sortSelect.addEventListener('change', handleSortSelectChange);

    if (saveBrushDetailsButton) saveBrushDetailsButton.addEventListener('click', handleSaveBrushDetails);
    if (applyTagsButton) applyTagsButton.addEventListener('click', handleApplyTags);
    if (createNewSetButton) createNewSetButton.addEventListener('click', handleCreateNewBrushSet);
    
    if (deleteSelectedButtonFixed) deleteSelectedButtonFixed.addEventListener('click', handleDeleteSelectedBrushes);

    // Mobile UI Event Listeners
    if (mobileNavToggle) mobileNavToggle.addEventListener('click', handleMobileNavToggle);
    if (pageOverlay) pageOverlay.addEventListener('click', handlePageOverlayClick);
    if (mobileSearchToggle) mobileSearchToggle.addEventListener('click', handleMobileSearchToggle);
    if (mobileSearchInput) mobileSearchInput.addEventListener('input', handleMobileSearchInput);
    if (mobileSortToggle) mobileSortToggle.addEventListener('click', handleMobileSortToggle);
    if (mobileSortOptions) mobileSortOptions.addEventListener('click', handleMobileSortSelect);

    if (mobileTagButton) mobileTagButton.addEventListener('click', handleMobileTagAction);
    if (mobileCreateSetButton) mobileCreateSetButton.addEventListener('click', handleCreateNewBrushSet);
    if (mobileEditButton) mobileEditButton.addEventListener('click', handleMobileEditAction);
    if (mobileDeleteButton) mobileDeleteButton.addEventListener('click', handleDeleteSelectedBrushes);

    // Help Modal Listeners
    if (headerHelpToggle) headerHelpToggle.addEventListener('click', handleHelpToggle);
    if (mobileHeaderHelpToggle) mobileHeaderHelpToggle.addEventListener('click', handleHelpToggle);
    if (closeHelpModal) closeHelpModal.addEventListener('click', handleHelpToggle);


    console.log("Brush Commander Beta Initialized and Event Listeners Attached."); // NAME CHANGE
    updateStatus("Welcome to Brush Commander Beta! Import .brush or .brushset files to begin organizing your Procreate brushes."); // NAME CHANGE
});

function initDemoModeFeatures() {
    const demoBanner = document.getElementById('demoModeBanner');
    const purchaseLink = document.getElementById('purchaseLink'); // Assuming this link would go to a purchase/info page

    // If IS_DEMO_MODE is true, this banner will show. 
    // For a paid Beta, IS_DEMO_MODE would typically be false.
    // You might repurpose this banner for general Beta announcements if needed.
    if (IS_DEMO_MODE) { 
        if (demoBanner) {
            demoBanner.innerHTML = `You are using the Demo Version of Brush Commander Beta. <a href="#" id="purchaseLinkForDemo">Upgrade to Full Beta Access!</a>`;
            demoBanner.style.display = 'block';
            const demoPurchaseLink = document.getElementById('purchaseLinkForDemo');
            if (demoPurchaseLink) {
                 demoPurchaseLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    alert("Thank you for your interest! Visit our website to get full Beta access.");
                });
            }
        }
        // Disable features for demo as before
        if (createNewSetButton) {
            createNewSetButton.disabled = true;
            createNewSetButton.title = "Feature available in full Beta version.";
            createNewSetButton.classList.add('button-style-disabled');
        }
        if (mobileCreateSetButton) {
            mobileCreateSetButton.disabled = true;
            mobileCreateSetButton.title = "Feature available in full Beta version.";
            mobileCreateSetButton.classList.add('button-style-disabled');
        }
    } else {
        // If not in demo mode (i.e., full paid Beta)
        if (demoBanner) {
            // Optionally use the banner to just say "Welcome to the Beta"
            // demoBanner.textContent = "Welcome to the Brush Commander Beta! We appreciate your support.";
            // demoBanner.style.display = 'block'; // Or keep it hidden if no message needed
            demoBanner.style.display = 'none'; 
        }
        if (createNewSetButton) {
             createNewSetButton.classList.remove('button-style-disabled');
             createNewSetButton.disabled = false; // Ensure it's enabled
        }
         if (mobileCreateSetButton) {
            mobileCreateSetButton.classList.remove('button-style-disabled');
            mobileCreateSetButton.disabled = false; // Ensure it's enabled
        }
    }
}
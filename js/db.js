// --- DATABASE SETUP (Dexie.js) ---
const db = new Dexie("ProcreateBrushManagerDB");

// Corrected schema: removed the dangling comma after dateAdded and before isFavorite
db.version(7).stores({
    brushes: `++internalId, [uuid+sourceFileName], uuid, name, dateAdded, isFavorite, thumbnailBlob, sourceFileName, isFromSet, setName, *tags, notes, brushArchiveBlob, shapeBlob, grainBlob`,
    userCollections: `++id, name, dateCreated, *brushInternalIds`
}).upgrade(tx => {
    console.log("Upgrading database schema for version 7. If 'category' index existed, it is now removed.");
    // No explicit data migration needed for simply removing an unused, non-critical index.
    // Dexie handles schema changes gracefully. If the 'category' field still exists on old records,
    // it will just be plain data and no longer indexed.
});


// --- DATA MODELS / CONSTRUCTORS ---
function BrushInfo(uuid, name, thumbnailBlob, sourceFileName, isFromSet = false, setName = null) {
    this.uuid = uuid || `brush_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.name = name || "Untitled Brush";
    this.dateAdded = new Date();
    // this.category = ""; // Field removed
    this.isFavorite = false;
    this.thumbnailBlob = thumbnailBlob;
    this.sourceFileName = sourceFileName;
    this.isFromSet = isFromSet;
    this.setName = setName;
    this.tags = [];
    this.notes = "";
    this.brushArchiveBlob = null;
    this.shapeBlob = null;
    this.grainBlob = null;
}

function UserCollectionInfo(name) { // Kept for data continuity
    this.name = name;
    this.brushInternalIds = [];
    this.dateCreated = new Date();
}

// --- CORE DB OPERATIONS ---
async function saveBrushToDB(brushData) {
    try {
        if (!brushData.dateAdded) brushData.dateAdded = new Date();
        // delete brushData.category; // Ensure category is not present if old data model is used
        const existing = await db.brushes.where({ uuid: brushData.uuid, sourceFileName: brushData.sourceFileName }).first();
        if (existing) {
            console.log(`Brush "${brushData.name}" (UUID: ${brushData.uuid}) from "${brushData.sourceFileName}" already in DB. Skipping.`);
            return existing.internalId;
        }
        return await db.brushes.add(brushData);
    } catch (error) {
        console.error("Error saving brush:", brushData.name, error);
        if (updateStatus) { // Check if updateStatus is defined
            updateStatus(`Error saving brush "${brushData.name}" to DB. Possible duplicate or other issue.`, true);
        }
        return null;
    }
}

async function loadBrushesFromDBAndRender() {
    try {
        const searchTerm = (searchInput && searchInput.value || mobileSearchInput && mobileSearchInput.value || '').toLowerCase().trim();
        const favoritesOnly = currentViewMode === 'favorites';
        let allBrushesInDB = await db.brushes.toArray();

        let filteredBrushes = allBrushesInDB.filter(brush => {
            let matchesSearch = !searchTerm || (
                (brush.name && brush.name.toLowerCase().includes(searchTerm)) ||
                (brush.setName && brush.setName.toLowerCase().includes(searchTerm)) ||
                (brush.sourceFileName && brush.sourceFileName.toLowerCase().includes(searchTerm)) ||
                (brush.uuid && brush.uuid.toLowerCase().includes(searchTerm)) ||
                (brush.tags && brush.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
            );

            let matchesFavorite = !favoritesOnly || brush.isFavorite;
            let matchesBrushSet = !activeBrushSetFilter || (brush.isFromSet && brush.setName === activeBrushSetFilter);
            let matchesTag = true;
            if (activeTagFilter) {
                if (activeTagFilter === 'UNTAGGED_FILTER') {
                    matchesTag = (!brush.tags || brush.tags.length === 0);
                } else {
                    matchesTag = brush.tags && brush.tags.includes(activeTagFilter);
                }
            }

            if (currentViewMode === 'favorites') return matchesFavorite && matchesSearch && matchesBrushSet && matchesTag;
            if (currentViewMode === 'set') return matchesBrushSet && matchesSearch && matchesFavorite && matchesTag;
            if (currentViewMode === 'tag') return matchesTag && matchesSearch && matchesFavorite && matchesBrushSet;

            return matchesSearch && matchesFavorite && matchesBrushSet && matchesTag;
        });

        const currentSort = sortSelect ? sortSelect.value : 'name_asc'; // Handle if sortSelect not ready
        filteredBrushes.sort((a, b) => {
            switch (currentSort) {
                case 'name_asc': return a.name.localeCompare(b.name);
                case 'name_desc': return b.name.localeCompare(a.name);
                case 'date_desc': return (new Date(b.dateAdded).getTime() || 0) - (new Date(a.dateAdded).getTime() || 0);
                case 'date_asc': return (new Date(a.dateAdded).getTime() || 0) - (new Date(b.dateAdded).getTime() || 0);
                case 'set_asc':
                    const sa = a.isFromSet && a.setName ? a.setName : "\uffff";
                    const sb = b.isFromSet && b.setName ? b.setName : "\uffff";
                    return sa.localeCompare(sb);
                case 'set_desc':
                    const sda = a.isFromSet && a.setName ? a.setName : "";
                    const sdb = b.isFromSet && b.setName ? b.setName : "";
                    return sdb.localeCompare(sda);
                default: return a.name.localeCompare(b.name);
            }
        });

        currentlyRenderedBrushes = filteredBrushes;
        updateMainContentTitle(filteredBrushes.length);
        renderBrushLibrary(filteredBrushes);
        updateSelectedBrushActionsPanelContent();

        await populateBrushSetsSidebar();
        await populateTagsSidebar();
        updateSelectDeselectAllButtonsState();

    } catch (error) {
        console.error("Error loading brushes:", error);
        if (updateStatus) { // Check if updateStatus is defined
            updateStatus("Error loading brushes from the database.", true);
        }
        currentlyRenderedBrushes = [];
        await populateBrushSetsSidebar();
        await populateTagsSidebar();
        updateSelectDeselectAllButtonsState();
    }
}
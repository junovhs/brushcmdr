// --- File Processing Functions ---

async function extractBrushAssets(zip, basePathInZip, brushInfoInstance) {
    const brushArchivePath = basePathInZip + 'Brush.archive';
    const shapePath = basePathInZip + 'Shape.png';
    const grainPath = basePathInZip + 'Grain.png';

    const brushArchiveFile = zip.file(brushArchivePath);
    if (brushArchiveFile) {
        brushInfoInstance.brushArchiveBlob = await brushArchiveFile.async('blob');
    } else {
        console.warn(`Brush.archive not found at ${brushArchivePath} for ${brushInfoInstance.name}`);
    }

    const shapeFile = zip.file(shapePath);
    if (shapeFile) {
        brushInfoInstance.shapeBlob = await shapeFile.async('blob');
    }

    const grainFile = zip.file(grainPath);
    if (grainFile) {
        brushInfoInstance.grainBlob = await grainFile.async('blob');
    }
}

async function processBrushsetFile(file, zipInstance) {
    let brushesAddedCount = 0;
    if (typeof window.bplistParserManual?.parseBuffer !== 'function') {
        updateStatus("Critical: bplistParser not available. Cannot process .brushset.", true);
        throw new Error("bplistParser not available.");
    }
    const zip = zipInstance || await JSZip.loadAsync(file);
    let brushSetPlistPath = null;

    zip.forEach((relativePath, zipEntry) => {
        if (zipEntry.name.toLowerCase() === 'brushset.plist' && !zipEntry.dir && zipEntry.name.indexOf('/') === -1) {
            brushSetPlistPath = zipEntry.name;
        }
    });
    if (!brushSetPlistPath) {
         const rootFiles = Object.keys(zip.files).filter(fileName => !fileName.includes('/'));
         const plistFile = rootFiles.find(fileName => fileName.toLowerCase().endsWith('brushset.plist'));
         if (plistFile) brushSetPlistPath = plistFile;
    }

    if (!brushSetPlistPath) {
        console.warn(`brushset.plist not found in the root of ${file.name}.`);
        updateStatus(`Could not find brushset.plist in ${file.name}.`, true);
        return brushesAddedCount;
    }

    const plistFileContents = await zip.file(brushSetPlistPath).async('string');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(plistFileContents, "application/xml");

    if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
        console.error("Error parsing brushset.plist XML for " + file.name, xmlDoc.getElementsByTagName("parsererror")[0]);
        updateStatus(`Error parsing the brushset.plist XML for ${file.name}.`, true);
        return brushesAddedCount;
    }

    let setNameFromFile = file.name.replace(/\.brushset$/i, '');
    const dictElement = xmlDoc.querySelector('plist > dict');
    const brushUUIDsInSet = [];

    if (dictElement) {
        const children = Array.from(dictElement.children);
        for (let i = 0; i < children.length; i++) {
            if (children[i].tagName === 'key' && children[i].textContent === 'name') {
                if (children[i+1] && children[i+1].tagName === 'string') {
                    setNameFromFile = children[i+1].textContent;
                }
            } else if (children[i].tagName === 'key' && children[i].textContent === 'brushes') {
                if (children[i+1] && children[i+1].tagName === 'array') {
                    Array.from(children[i+1].children).filter(el => el.tagName === 'string').forEach(s => brushUUIDsInSet.push(s.textContent));
                }
            }
        }
    } else {
         updateStatus(`Valid 'dict' structure not found in brushset.plist for ${file.name}.`, true);
         return brushesAddedCount;
    }

    for (const uuid of brushUUIDsInSet) {
        if (IS_DEMO_MODE) {
            const currentBrushCount = await db.brushes.count();
            if (currentBrushCount >= DEMO_BRUSH_LIMIT) {
                console.warn(`Demo limit reached. Skipping brush ${uuid} from set ${setNameFromFile}.`);
                // updateStatus below will handle the overall message for the set
                continue;
            }
        }

        const brushFolderPathInZip = uuid + '/';
        let brushNameFromArchive = uuid;
        let thumbnailBlob = null;

        const thumbnailFile = zip.file(brushFolderPathInZip + 'QuickLook/Thumbnail.png');
        if (thumbnailFile) {
            try { thumbnailBlob = await thumbnailFile.async('blob'); }
            catch (thumbError) { console.warn(`Could not extract thumbnail for ${uuid} in ${file.name}:`, thumbError); }
        }

        const brushArchiveFile = zip.file(brushFolderPathInZip + 'Brush.archive');
        if (brushArchiveFile) {
            try {
                const baBuffer = await brushArchiveFile.async('arraybuffer');
                const parsedArchiveArray = window.bplistParserManual.parseBuffer(baBuffer);
                const parsedArchive = parsedArchiveArray[0];
                if (parsedArchive && parsedArchive['$objects'] && Array.isArray(parsedArchive['$objects']) && parsedArchive['$top']?.root?.UID !== undefined) {
                    const rootUID = parsedArchive['$top'].root.UID;
                    if (parsedArchive['$objects'][rootUID]) {
                        const rootObject = parsedArchive['$objects'][rootUID];
                        if (rootObject.name && rootObject.name instanceof window.bplistParserManual.UID) {
                            const nameUID = rootObject.name.UID;
                            if (parsedArchive['$objects'][nameUID] && typeof parsedArchive['$objects'][nameUID] === 'string') {
                                brushNameFromArchive = parsedArchive['$objects'][nameUID];
                            }
                        } else if (rootObject && typeof rootObject.name === 'string') {
                            brushNameFromArchive = rootObject.name;
                        }
                    }
                }
            } catch (parseError) { console.error(`Error parsing Brush.archive for ${uuid} in ${setNameFromFile}:`, parseError); }
        } else { console.warn(`Brush.archive not found for ${uuid} in ${setNameFromFile}`); }

        const newBrush = new BrushInfo(uuid, brushNameFromArchive, thumbnailBlob, file.name, true, setNameFromFile);
        await extractBrushAssets(zip, brushFolderPathInZip, newBrush);

        const existingBrush = await db.brushes.where({ uuid: newBrush.uuid, sourceFileName: newBrush.sourceFileName }).first();
        if (existingBrush) {
            console.log(`Brush "${newBrush.name}" (UUID: ${newBrush.uuid}) from "${newBrush.sourceFileName}" already in DB. Skipping.`);
        } else {
             if (await saveBrushToDB(newBrush)) brushesAddedCount++;
        }
    }

    if (IS_DEMO_MODE && (await db.brushes.count()) >= DEMO_BRUSH_LIMIT && brushesAddedCount < brushUUIDsInSet.length && brushUUIDsInSet.length > 0) {
         updateStatus(`Demo limit (${DEMO_BRUSH_LIMIT} brushes) reached. Some brushes from "${setNameFromFile}" may not have been added.`, true);
    } else if (brushesAddedCount === 0 && brushUUIDsInSet.length > 0) {
        updateStatus(`All brushes from set "${setNameFromFile}" were already in library or unprocessable.`);
    } else if (brushesAddedCount === 0 && brushUUIDsInSet.length === 0) { // No UUIDs in plist
        updateStatus(`No brushes defined in "${setNameFromFile}".`);
    }
    return brushesAddedCount;
}

async function processBrushFile(file) {
    let brushesAddedCount = 0;
    if (typeof window.bplistParserManual?.parseBuffer !== 'function') {
        updateStatus("Critical: bplistParser not available.", true);
        throw new Error("bplistParser not available.");
    }

    if (IS_DEMO_MODE) {
        const currentBrushCount = await db.brushes.count();
        if (currentBrushCount >= DEMO_BRUSH_LIMIT) {
            updateStatus(`Demo limit of ${DEMO_BRUSH_LIMIT} brushes reached. Cannot add "${file.name}". Upgrade for unlimited.`, true);
            return 0;
        }
    }

    const zip = await JSZip.loadAsync(file);
    let brushNameFromFile = file.name.replace(/\.brush$/i, '');
    let thumbnailBlob = null;
    let brushUUID = brushNameFromFile; // Default UUID to filename if not found in structure
    let basePathInZip = '';

    const rootEntries = Object.keys(zip.files).map(name => zip.files[name]);
    const rootFolders = rootEntries.filter(entry => entry.dir && entry.name.split('/').length === 2);

    if (rootFolders.length === 1) { // Standard .brush structure with a UUID named folder
        basePathInZip = rootFolders[0].name;
        brushUUID = basePathInZip.replace(/\/$/, '');
    } else if (rootEntries.some(entry => entry.name.toLowerCase() === 'brush.archive')) { // Allows Brush.archive in root
        basePathInZip = ''; // Files are in root
    } else {
        console.warn(`.brush file "${file.name}" has an unexpected structure. Attempting to find assets.`);
        // Try to find assets in common locations even if structure is odd
        const probableBasePath = rootFolders.length > 0 ? rootFolders[0].name : '';
        if (zip.file(probableBasePath + 'Brush.archive')) {
            basePathInZip = probableBasePath;
            if (probableBasePath) brushUUID = probableBasePath.replace(/\/$/, '');
        } else {
             updateStatus(`Could not determine structure or find Brush.archive in "${file.name}".`, true);
             return 0;
        }
    }


    const thumbnailPath = basePathInZip + 'QuickLook/Thumbnail.png';
    const thumbnailFile = zip.file(thumbnailPath);
    if (thumbnailFile) {
        try { thumbnailBlob = await thumbnailFile.async('blob'); }
        catch (thumbError) { console.warn(`Could not extract thumbnail for ${file.name}:`, thumbError); }
    } else { console.warn(`Thumbnail.png not found for ${file.name} at ${thumbnailPath}`); }

    const brushArchivePath = basePathInZip + 'Brush.archive';
    const brushArchiveFile = zip.file(brushArchivePath);
    if (brushArchiveFile) {
        try {
            const baBuffer = await brushArchiveFile.async('arraybuffer');
            const parsedArchiveArray = window.bplistParserManual.parseBuffer(baBuffer);
            const parsedArchive = parsedArchiveArray[0];
            if (parsedArchive && parsedArchive['$objects'] && Array.isArray(parsedArchive['$objects']) && parsedArchive['$top']?.root?.UID !== undefined) {
                const rootUID = parsedArchive['$top'].root.UID;
                if (parsedArchive['$objects'][rootUID]) {
                    const rootObject = parsedArchive['$objects'][rootUID];
                    if (rootObject.name && rootObject.name instanceof window.bplistParserManual.UID) {
                        const nameUID = rootObject.name.UID;
                        if (parsedArchive['$objects'][nameUID] && typeof parsedArchive['$objects'][nameUID] === 'string') {
                            brushNameFromFile = parsedArchive['$objects'][nameUID];
                        }
                    } else if (rootObject && typeof rootObject.name === 'string') {
                        brushNameFromFile = rootObject.name;
                    }
                }
            }
        } catch (parseError) { console.error(`Error parsing Brush.archive for ${file.name}:`, parseError); }
    } else { console.warn(`Brush.archive not found for ${file.name} at ${brushArchivePath}`); }

    const newBrush = new BrushInfo(brushUUID, brushNameFromFile, thumbnailBlob, file.name, false, null);
    await extractBrushAssets(zip, basePathInZip, newBrush);

    const existingBrush = await db.brushes.where({ uuid: newBrush.uuid, sourceFileName: newBrush.sourceFileName }).first();
    if (existingBrush) {
        console.log(`Brush "${newBrush.name}" (UUID: ${newBrush.uuid}) from "${newBrush.sourceFileName}" already in DB. Skipping.`);
    } else {
        if (await saveBrushToDB(newBrush)) brushesAddedCount++;
    }
    return brushesAddedCount;
}
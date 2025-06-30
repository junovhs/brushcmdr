// --- File Processing Functions ---

async function extractBrushAssets(zip, basePathInZip, brushInfoInstance) {
    const brushArchivePath = basePathInZip + 'Brush.archive';
    const shapePath = basePathInZip + 'Shape.png';
    const grainPath = basePathInZip + 'Grain.png';

    const brushArchiveFile = zip.file(brushArchivePath);
    if (brushArchiveFile) {
        brushInfoInstance.brushArchiveBlob = await brushArchiveFile.async('blob');
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

function getBplistValue(objects, uid) {
    if (uid instanceof window.bplistParserManual.UID) {
        const value = objects[uid.UID];
        return value;
    }
    return uid;
}


async function processBrushsetFile(file, zipInstance) {
    let brushesAddedCount = 0;
    const zip = zipInstance || await JSZip.loadAsync(file);
    let brushSetPlistPath = Object.keys(zip.files).find(name => name.toLowerCase().endsWith('brushset.plist') && !name.includes('/'));

    if (!brushSetPlistPath) {
        updateStatus(`Could not find a root-level brushset.plist in ${file.name}.`, true);
        return 0;
    }

    const plistFileContents = await zip.file(brushSetPlistPath).async('string');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(plistFileContents, "application/xml");

    let setNameFromFile = file.name.replace(/\.brushset$/i, '');
    const dictElement = xmlDoc.querySelector('plist > dict');
    const brushUUIDsInSet = [];

    if (dictElement) {
        Array.from(dictElement.children).forEach((node, index, arr) => {
            if (node.tagName === 'key' && node.textContent === 'name' && arr[index + 1]) {
                setNameFromFile = arr[index + 1].textContent;
            } else if (node.tagName === 'key' && node.textContent === 'brushes' && arr[index + 1]) {
                Array.from(arr[index + 1].children).forEach(s => brushUUIDsInSet.push(s.textContent));
            }
        });
    }

    for (const uuid of brushUUIDsInSet) {
        const brushFolderPathInZip = uuid + '/';
        let brushNameFromArchive = uuid;
        let authorNameFromArchive = "Unknown";
        let thumbnailBlob = null;

        const thumbnailFile = zip.file(brushFolderPathInZip + 'QuickLook/Thumbnail.png');
        if (thumbnailFile) thumbnailBlob = await thumbnailFile.async('blob').catch(() => null);

        const brushArchiveFile = zip.file(brushFolderPathInZip + 'Brush.archive');
        if (brushArchiveFile) {
            try {
                const baBuffer = await brushArchiveFile.async('arraybuffer');
                const parsedArchive = window.bplistParserManual.parseBuffer(baBuffer)[0];
                const objects = parsedArchive?.$objects;

                if (objects && parsedArchive.$top?.root?.UID !== undefined) {
                    const rootObject = getBplistValue(objects, parsedArchive.$top.root);
                    if (rootObject) {
                        const name = getBplistValue(objects, rootObject.name);
                        if (typeof name === 'string') brushNameFromArchive = name;

                        // New robust author name logic
                        let author = getBplistValue(objects, rootObject.authorName);
                        if (typeof author !== 'string' || author.trim() === '') {
                            const signature = getBplistValue(objects, rootObject.signature);
                            if (signature && signature.name) {
                                author = getBplistValue(objects, signature.name);
                            }
                        }
                        if (typeof author === 'string' && author.trim() !== '') {
                            authorNameFromArchive = author;
                        }
                    }
                }
            } catch (parseError) { console.error(`Error parsing Brush.archive for ${uuid}`, parseError); }
        }

        const newBrush = new BrushInfo(uuid, brushNameFromArchive, thumbnailBlob, file.name, true, setNameFromFile, authorNameFromArchive);
        await extractBrushAssets(zip, brushFolderPathInZip, newBrush);
        if (await saveBrushToDB(newBrush)) brushesAddedCount++;
    }

    return brushesAddedCount;
}

async function processBrushFile(file) {
    const zip = await JSZip.loadAsync(file);
    let brushNameFromFile = file.name.replace(/\.brush$/i, '');
    let authorNameFromFile = "Unknown";
    let thumbnailBlob = null;
    let brushUUID = brushNameFromFile; 
    let basePathInZip = '';

    const rootFolders = Object.keys(zip.files).filter(name => name.endsWith('/') && name.split('/').length === 2);
    if (rootFolders.length === 1) {
        basePathInZip = rootFolders[0];
        brushUUID = basePathInZip.replace(/\/$/, '');
    }

    const thumbnailPath = basePathInZip + 'QuickLook/Thumbnail.png';
    const thumbnailFile = zip.file(thumbnailPath);
    if (thumbnailFile) thumbnailBlob = await thumbnailFile.async('blob').catch(() => null);

    const brushArchivePath = basePathInZip + 'Brush.archive';
    const brushArchiveFile = zip.file(brushArchivePath);
    if (brushArchiveFile) {
        try {
            const baBuffer = await brushArchiveFile.async('arraybuffer');
            const parsedArchive = window.bplistParserManual.parseBuffer(baBuffer)[0];
            const objects = parsedArchive?.$objects;

            if (objects && parsedArchive.$top?.root?.UID !== undefined) {
                const rootObject = getBplistValue(objects, parsedArchive.$top.root);
                if (rootObject) {
                    const name = getBplistValue(objects, rootObject.name);
                    if (typeof name === 'string') brushNameFromFile = name;
                    
                    let author = getBplistValue(objects, rootObject.authorName);
                    if (typeof author !== 'string' || author.trim() === '') {
                        const signature = getBplistValue(objects, rootObject.signature);
                        if (signature && signature.name) {
                            author = getBplistValue(objects, signature.name);
                        }
                    }
                    if (typeof author === 'string' && author.trim() !== '') {
                        authorNameFromFile = author;
                    }
                }
            }
        } catch (parseError) { console.error(`Error parsing Brush.archive for ${file.name}`, parseError); }
    }
    
    const newBrush = new BrushInfo(brushUUID, brushNameFromFile, thumbnailBlob, file.name, false, null, authorNameFromFile);
    await extractBrushAssets(zip, basePathInZip, newBrush);

    return await saveBrushToDB(newBrush) ? 1 : 0;
}
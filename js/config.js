// --- APP VERSION & MODE ---
const APP_VERSION = "1.0.3"; // Or your current version
const IS_DEMO_MODE = false;  // Set to false, as access is controlled by code now
const DEMO_BRUSH_LIMIT = 20;

// --- ACCESS CONTROL ---
const SHARED_ACCESS_CODE = "YOUR_BETA_ACCESS_CODE_HERE"; // Replace with your actual shared code
const LOCAL_STORAGE_ACCESS_KEY = "brushCommanderBetaAccessGranted_v1"; // Add a version in case you change the code system later

// Global App State Variables
let currentViewMode = 'all';
let activeBrushSetFilter = null;
let activeTagFilter = null;
let selectedBrushInternalIds = new Set();
let currentlyRenderedBrushes = [];

let originalZipForRepackaging = null;
let firstBrushsetFileName = 'repackaged.brushset';
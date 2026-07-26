const fs = require('fs-extra');
const path = require('path');
const filePath = path.join(__dirname, '../data/config.json');

// Ensure directory and file exist
fs.ensureFileSync(filePath);

const getStoredConfig = () => {
    try {
        const data = fs.readJsonSync(filePath);
        return data || { connections: [], relationships: [] };
    } catch {
        // Return default empty state if file is empty or corrupted
        return { connections: [], relationships: [] };
    }
};

const saveConfig = (data) => {
    fs.writeJsonSync(filePath, data, { spaces: 2 });
};

module.exports = { getStoredConfig, saveConfig };
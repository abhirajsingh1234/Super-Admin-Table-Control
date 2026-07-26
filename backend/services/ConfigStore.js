const fs = require('fs-extra');
const path = require('path');

const filePath = path.join(__dirname, '../data/config.json');
fs.ensureFileSync(filePath);

const getConfig = () => {
  try {
    const data = fs.readJsonSync(filePath);
    return data || { connections: [], relationships: [] };
  } catch {
    return { connections: [], relationships: [] };
  }
};

const saveConfig = (data) => {
  fs.writeJsonSync(filePath, data, { spaces: 2 });
};

module.exports = { getConfig, saveConfig };
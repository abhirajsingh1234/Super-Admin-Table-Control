const { getConfig, saveConfig } = require('../services/ConfigStore');
const db = require('../services/dbService');

// GET /api/config
exports.getConfig = (req, res) => {
  res.json(getConfig());
};

// POST /api/connect — test connection + return tables
exports.connect = async (req, res) => {
  const { connectionString, databaseName } = req.body;
  if (!connectionString || !databaseName)
    return res.json({ success: false, error: 'connectionString and databaseName are required.' });
  try {
    const tables = await db.getTables(connectionString);
    res.json({ success: true, tables });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
};

// POST /api/save-tables — persist connection + selected tables
exports.saveTables = (req, res) => {
  const { connectionString, databaseName, selectedTables } = req.body;
  if (!connectionString || !databaseName)
    return res.json({ success: false, error: 'Missing fields.' });
  const config = getConfig();
  // Single connection only — always replace
  config.connections = [{ connectionString, databaseName, selectedTables: selectedTables || [] }];
  saveConfig(config);
  res.json({ success: true });
};

// DELETE /api/connection/:databaseName — remove a saved connection
exports.deleteConnection = (req, res) => {
  const { databaseName } = req.params;
  const config = getConfig();
  config.connections = config.connections.filter(c => c.databaseName !== databaseName);
  saveConfig(config);
  res.json({ success: true });
};

// GET /api/columns?tableName=X
exports.getColumns = async (req, res) => {
  const { tableName } = req.query;
  const config = getConfig();
  const conn = config.connections.find(c => c.selectedTables.includes(tableName));
  if (!conn) return res.json({ success: false, error: 'Table not found in any connection.' });
  try {
    const columns = await db.getColumns(conn.connectionString, tableName);
    res.json({ success: true, columns });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
};

// GET /api/table-data?tableName=X
exports.getTableData = async (req, res) => {
  const { tableName } = req.query;
  const config = getConfig();
  const conn = config.connections.find(c => c.selectedTables.includes(tableName));
  if (!conn) return res.json({ success: false, error: 'Table not found in any connection.' });
  try {
    const data = await db.getTableData(conn.connectionString, tableName);
    res.json({ success: true, ...data });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
};

// POST /api/table-row
exports.insertRow = async (req, res) => {
  const { tableName, rowData } = req.body;
  const config = getConfig();
  const conn = config.connections.find(c => c.selectedTables.includes(tableName));
  if (!conn) return res.json({ success: false, error: 'Table not found.' });
  try {
    await db.insertRow(conn.connectionString, tableName, rowData);
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
};

// POST /api/table-row-update
exports.updateRow = async (req, res) => {
  const { tableName, originalData, updatedData } = req.body;
  const config = getConfig();
  const conn = config.connections.find(c => c.selectedTables.includes(tableName));
  if (!conn) return res.json({ success: false, error: 'Table not found.' });
  try {
    await db.updateRow(conn.connectionString, tableName, originalData, updatedData);
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
};

// POST /api/table-row-delete
exports.deleteRow = async (req, res) => {
  const { tableName, rowData } = req.body;
  const config = getConfig();
  const conn = config.connections.find(c => c.selectedTables.includes(tableName));
  if (!conn) return res.json({ success: false, error: 'Table not found.' });
  try {
    await db.deleteRow(conn.connectionString, tableName, rowData);
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
};

// POST /api/relationships
exports.saveRelationships = (req, res) => {
  const { relationships } = req.body;
  const config = getConfig();
  config.relationships = relationships;
  saveConfig(config);
  res.json({ success: true });
};
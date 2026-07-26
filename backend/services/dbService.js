const sql = require('mssql');

// Strip Encrypt=false and add TrustServerCertificate to avoid SSL issues
const buildConfig = (connectionString) => {
  // Parse standard MSSQL connection string format
  const parts = {};
  connectionString.split(';').forEach(part => {
    const [key, ...rest] = part.split('=');
    if (key && rest.length) parts[key.trim().toLowerCase()] = rest.join('=').trim();
  });

  return {
    server: parts['server'] || parts['data source'] || 'localhost',
    database: parts['database'] || parts['initial catalog'],
    options: {
      encrypt: parts['encrypt'] !== 'false',
      trustServerCertificate: true,
      enableArithAbort: true,
    },
    ...(parts['trusted_connection'] === 'true'
      ? { domain: parts['domain'] || undefined, options: { ...this?.options, trustedConnection: true, trustServerCertificate: true } }
      : {
          user: parts['user id'] || parts['uid'],
          password: parts['password'] || parts['pwd'],
        }),
  };
};

const connect = async (connectionString) => {
  const config = buildConfig(connectionString);
  return await sql.connect(config);
};

const getTables = async (connectionString) => {
  const pool = await connect(connectionString);
  const result = await pool.request().query(`
    SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_TYPE = 'BASE TABLE'
      AND TABLE_NAME NOT LIKE 'sys%'
      AND TABLE_NAME NOT LIKE 'queue_%'
    ORDER BY TABLE_NAME ASC
  `);
  await pool.close();
  return result.recordset.map(r => r.TABLE_NAME);
};

const getColumns = async (connectionString, tableName) => {
  const pool = await connect(connectionString);
  const result = await pool.request()
    .input('table', sql.NVarChar, tableName)
    .query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = @table
      ORDER BY ORDINAL_POSITION
    `);
  await pool.close();
  return result.recordset.map(r => r.COLUMN_NAME);
};

const getTableData = async (connectionString, tableName) => {
  const pool = await connect(connectionString);
  // Get columns
  const colResult = await pool.request()
    .input('table', sql.NVarChar, tableName)
    .query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = @table ORDER BY ORDINAL_POSITION`);
  const columns = colResult.recordset.map(r => r.COLUMN_NAME);
  // Get rows
  const dataResult = await pool.request().query(`SELECT TOP 500 * FROM [${tableName}]`);
  await pool.close();
  return { columns, rows: dataResult.recordset };
};

const insertRow = async (connectionString, tableName, rowData) => {
  const pool = await connect(connectionString);
  const cols = Object.keys(rowData).filter(k => rowData[k] !== '' && rowData[k] !== undefined);
  if (!cols.length) throw new Error('No data provided');
  const req = pool.request();
  cols.forEach(col => req.input(col, rowData[col]));
  const colList = cols.map(c => `[${c}]`).join(', ');
  const valList = cols.map(c => `@${c}`).join(', ');
  await req.query(`INSERT INTO [${tableName}] (${colList}) VALUES (${valList})`);
  await pool.close();
};

// Helper to get identity columns for a table
const getIdentityColumns = async (pool, tableName) => {
  const result = await pool.request()
    .input('table', sql.NVarChar, tableName)
    .query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = @table 
        AND COLUMNPROPERTY(OBJECT_ID(TABLE_NAME), COLUMN_NAME, 'IsIdentity') = 1
    `);
  return result.recordset.map(r => r.COLUMN_NAME);
};

// Helper to get primary key columns
const getPrimaryKeys = async (pool, tableName) => {
  const result = await pool.request()
    .input('table', sql.NVarChar, tableName)
    .query(`
      SELECT c.COLUMN_NAME
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
      JOIN INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE c 
        ON tc.CONSTRAINT_NAME = c.CONSTRAINT_NAME
      WHERE tc.TABLE_NAME = @table AND tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
    `);
  return result.recordset.map(r => r.COLUMN_NAME);
};

const updateRow = async (connectionString, tableName, originalData, updatedData) => {
  const pool = await connect(connectionString);
  
  const identityCols = await getIdentityColumns(pool, tableName);
  const pkCols       = await getPrimaryKeys(pool, tableName);
  
  const req = pool.request();
  const setClauses = [];
  
  // Exclude identity columns from SET
  Object.keys(updatedData)
    .filter(col => !identityCols.includes(col))
    .forEach((col, i) => {
      req.input(`new_${i}`, updatedData[col]);
      setClauses.push(`[${col}] = @new_${i}`);
    });

  if (!setClauses.length) {
    await pool.close();
    throw new Error('No updatable columns after excluding identity columns.');
  }

  // Use PKs for WHERE if available, otherwise fall back to all non-null original cols
  const whereKeys = pkCols.length ? pkCols : Object.keys(originalData);
  const whereClauses = [];
  whereKeys.forEach((col, i) => {
    const val = originalData[col];
    if (val !== null && val !== undefined) {
      req.input(`old_${i}`, val);
      whereClauses.push(`[${col}] = @old_${i}`);
    } else {
      whereClauses.push(`[${col}] IS NULL`);
    }
  });

  await req.query(
    `UPDATE [${tableName}] SET ${setClauses.join(', ')} WHERE ${whereClauses.join(' AND ')}`
  );
  await pool.close();
};

const deleteRow = async (connectionString, tableName, rowData) => {
  const pool = await connect(connectionString);
  
  const pkCols = await getPrimaryKeys(pool, tableName);
  
  const req = pool.request();
  const whereClauses = [];

  // Use PKs for WHERE if available — much safer and precise
  const whereKeys = pkCols.length ? pkCols : Object.keys(rowData);
  whereKeys.forEach((col, i) => {
    const val = rowData[col];
    if (val !== null && val !== undefined) {
      req.input(`w_${i}`, val);
      whereClauses.push(`[${col}] = @w_${i}`);
    } else {
      whereClauses.push(`[${col}] IS NULL`);
    }
  });

  await req.query(`DELETE FROM [${tableName}] WHERE ${whereClauses.join(' AND ')}`);
  await pool.close();
};
module.exports = { getTables, getColumns, getTableData, insertRow, updateRow, deleteRow };
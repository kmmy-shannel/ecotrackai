const pool = require('../config/database');

const REQUIRED_CATALOG_COLUMNS = new Set([
  'name',
  'default_storage_type',
  'temperature_range_min',
  'temperature_range_max',
  'humidity_range',
  'default_shelf_life_days'
]);

// ── IMPORTANT: 'products' added — global fruits live here with business_id IS NULL
const CATALOG_TABLE_CANDIDATES = [
  'fruit_catalog',
  'global_fruit_catalog',
  'master_fruit_catalog',
  'catalog_fruits',
  'fruits',
  'products'
];

const AUDIT_ALLOWED_COLUMNS = new Set([
  'business_id', 'user_id', 'event_type', 'action',
  'entity_type', 'entity_id', 'reason', 'details',
  'message', 'metadata', 'created_at', 'timestamp'
]);

// Columns that exist in 'products' but map to catalog field names
const PRODUCTS_COLUMN_MAP = {
  name:                    'product_name',
  default_storage_type:    'storage_category',
  temperature_range_min:   'optimal_temp_min',
  temperature_range_max:   'optimal_temp_max',
  humidity_range:          null,               // derived below
  default_shelf_life_days: 'shelf_life_days',
};

const CatalogModel = {
  _cache: {
    catalog:      null,
    auditColumns: null
  },

  _isNil(value) { return value === null || value === undefined; },

  _handleDbError(method, error) {
    console.error(`[CatalogModel.${method}]`, error);
    if (error?.code === '23503') return 'Foreign key constraint violation';
    if (error?.code === '23505') return 'Duplicate record';
    return 'Database operation failed';
  },

  async _getColumns(tableName) {
    try {
      const { rows } = await pool.query(
        `SELECT column_name
         FROM information_schema.columns
         WHERE table_schema = current_schema() AND table_name = $1`,
        [tableName]
      );
      return rows.map(r => r.column_name);
    } catch (error) {
      console.error('[CatalogModel._getColumns]', error);
      return [];
    }
  },

  _resolveIdColumn(columns = []) {
    return ['fruit_id', 'catalog_id', 'product_id', 'id']
      .find(c => columns.includes(c)) || null;
  },

  // Check if this table can serve as a catalog
  // For 'products' table, required columns have different names so we check both
  _hasRequiredCatalogColumns(columns = [], tableName = '') {
    if (tableName === 'products') {
      // products uses different column names — check mapped names
      return (
        columns.includes('product_name') &&
        columns.includes('storage_category') &&
        columns.includes('shelf_life_days') &&
        columns.includes('optimal_temp_min') &&
        columns.includes('optimal_temp_max')
      );
    }
    return [...REQUIRED_CATALOG_COLUMNS].every(c => columns.includes(c));
  },

  async _resolveCatalogTable() {
    try {
      if (this._cache.catalog) return { success: true, data: this._cache.catalog };

      for (const tableName of CATALOG_TABLE_CANDIDATES) {
        const columns = await this._getColumns(tableName);
        if (!columns.length) continue;
        if (!this._hasRequiredCatalogColumns(columns, tableName)) continue;
        const idColumn = this._resolveIdColumn(columns);
        if (!idColumn) continue;

        const resolved = {
          tableName,
          columns,
          idColumn,
          isProductsTable: tableName === 'products'
        };
        this._cache.catalog = resolved;
        return { success: true, data: resolved };
      }

      return { success: false, error: 'Global fruit catalog table not found' };
    } catch (error) {
      return { success: false, error: this._handleDbError('_resolveCatalogTable', error) };
    }
  },

  async _getAuditColumns() {
    try {
      if (Array.isArray(this._cache.auditColumns)) return this._cache.auditColumns;
      const { rows } = await pool.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema = current_schema() AND table_name = 'audit_logs'`
      );
      const columns = rows
        .map(r => r.column_name)
        .filter(c => AUDIT_ALLOWED_COLUMNS.has(c));
      this._cache.auditColumns = columns;
      return columns;
    } catch (error) {
      console.error('[CatalogModel._getAuditColumns]', error);
      return [];
    }
  },

  // ── listAll — basic columns only ─────────────────────────────────────────

  async listAll() {
    try {
      const tableResult = await this._resolveCatalogTable();
      if (!tableResult.success) return tableResult;
      const { tableName, columns, idColumn, isProductsTable } = tableResult.data;

      let query;
      if (isProductsTable) {
        // products table: map column names + filter global catalog rows
        const extraCols = [];
        if (columns.includes('unit_of_measure'))     extraCols.push('unit_of_measure');
        if (columns.includes('image_url'))            extraCols.push('image_url');
        if (columns.includes('created_at'))           extraCols.push('created_at');

        query = `
          SELECT
            ${idColumn}              AS fruit_id,
            product_name             AS name,
            storage_category         AS default_storage_type,
            optimal_temp_min         AS temperature_range_min,
            optimal_temp_max         AS temperature_range_max,
            CONCAT(
              optimal_humidity_min, '-', optimal_humidity_max, '%'
            )                        AS humidity_range,
            shelf_life_days          AS default_shelf_life_days
            ${extraCols.length ? ', ' + extraCols.join(', ') : ''}
          FROM ${tableName}
          ORDER BY product_name ASC
        `;
      } else {
        const selectedColumns = [
          `${idColumn} AS fruit_id`, 'name', 'default_storage_type',
          'temperature_range_min', 'temperature_range_max',
          'humidity_range', 'default_shelf_life_days'
        ];
        if (columns.includes('created_at')) selectedColumns.push('created_at');
        if (columns.includes('updated_at')) selectedColumns.push('updated_at');

        query = `
          SELECT ${selectedColumns.join(', ')}
          FROM ${tableName}
          ORDER BY name ASC
        `;
      }

      const { rows } = await pool.query(query);
      return { success: true, data: rows };
    } catch (error) {
      return { success: false, error: this._handleDbError('listAll', error) };
    }
  },

  // ── NEW: listAllWithDetails — includes ripeness_stages, compatibility ─────

  async listAllWithDetails() {
    try {
      const tableResult = await this._resolveCatalogTable();
      if (!tableResult.success) return tableResult;
      const { tableName, columns, idColumn, isProductsTable } = tableResult.data;

      let query;
      if (isProductsTable) {
        // Build optional column list based on what actually exists
        const optionalCols = [];
        if (columns.includes('unit_of_measure'))      optionalCols.push('unit_of_measure');
        if (columns.includes('is_ethylene_producer')) optionalCols.push('is_ethylene_producer');
        if (columns.includes('compatible_with'))      optionalCols.push('compatible_with');
        if (columns.includes('avoid_with'))           optionalCols.push('avoid_with');
        if (columns.includes('ripeness_stages'))      optionalCols.push('ripeness_stages');
        if (columns.includes('image_url'))            optionalCols.push('image_url');
        if (columns.includes('created_at'))           optionalCols.push('created_at');

        query = `
          SELECT
            ${idColumn}              AS fruit_id,
            product_name             AS name,
            storage_category         AS default_storage_type,
            shelf_life_days          AS default_shelf_life_days,
            optimal_temp_min         AS temperature_range_min,
            optimal_temp_max         AS temperature_range_max,
            optimal_humidity_min,
            optimal_humidity_max,
            CONCAT(
              optimal_humidity_min, '-', optimal_humidity_max, '%'
            )                        AS humidity_range
            ${optionalCols.length ? ', ' + optionalCols.join(', ') : ''}
          FROM ${tableName}
          ORDER BY product_name ASC
        `;
      } else {
        // Non-products catalog table — select everything available
        const selectedColumns = [
          `${idColumn} AS fruit_id`, 'name', 'default_storage_type',
          'temperature_range_min', 'temperature_range_max',
          'humidity_range', 'default_shelf_life_days'
        ];
        const extras = [
          'unit_of_measure', 'is_ethylene_producer',
          'compatible_with', 'avoid_with', 'ripeness_stages',
          'image_url', 'created_at', 'updated_at'
        ];
        extras.forEach(col => {
          if (columns.includes(col)) selectedColumns.push(col);
        });

        query = `
          SELECT ${selectedColumns.join(', ')}
          FROM ${tableName}
          ORDER BY name ASC
        `;
      }

      const { rows } = await pool.query(query);
      return { success: true, data: rows };
    } catch (error) {
      return { success: false, error: this._handleDbError('listAllWithDetails', error) };
    }
  },

  // ── findById ──────────────────────────────────────────────────────────────

  async findById(fruitId) {
    if (this._isNil(fruitId)) return { success: false, error: 'fruitId is required' };

    try {
      const tableResult = await this._resolveCatalogTable();
      if (!tableResult.success) return tableResult;
      const { tableName, columns, idColumn, isProductsTable } = tableResult.data;

      let query;
      if (isProductsTable) {
        const optionalCols = [];
        if (columns.includes('unit_of_measure'))      optionalCols.push('unit_of_measure');
        if (columns.includes('is_ethylene_producer')) optionalCols.push('is_ethylene_producer');
        if (columns.includes('compatible_with'))      optionalCols.push('compatible_with');
        if (columns.includes('avoid_with'))           optionalCols.push('avoid_with');
        if (columns.includes('ripeness_stages'))      optionalCols.push('ripeness_stages');

        query = `
          SELECT
            ${idColumn}    AS fruit_id,
            product_name   AS name,
            storage_category AS default_storage_type,
            optimal_temp_min AS temperature_range_min,
            optimal_temp_max AS temperature_range_max,
            shelf_life_days  AS default_shelf_life_days,
            CONCAT(optimal_humidity_min, '-', optimal_humidity_max, '%') AS humidity_range
            ${optionalCols.length ? ', ' + optionalCols.join(', ') : ''}
          FROM ${tableName}
          WHERE ${idColumn} = $1
        `;
      } else {
        query = `
          SELECT
            ${idColumn} AS fruit_id, name, default_storage_type,
            temperature_range_min, temperature_range_max,
            humidity_range, default_shelf_life_days
          FROM ${tableName}
          WHERE ${idColumn} = $1
        `;
      }

      const { rows } = await pool.query(query, [fruitId]);
      if (rows.length === 0) return { success: false, error: 'Not found or unauthorized' };
      return { success: true, data: rows[0] };
    } catch (error) {
      return { success: false, error: this._handleDbError('findById', error) };
    }
  },

  // ── findByName ────────────────────────────────────────────────────────────

  async findByName(name) {
    if (this._isNil(name) || String(name).trim() === '') {
      return { success: false, error: 'name is required' };
    }

    try {
      const tableResult = await this._resolveCatalogTable();
      if (!tableResult.success) return tableResult;
      const { tableName, idColumn, isProductsTable } = tableResult.data;

      const nameColumn = isProductsTable ? 'product_name' : 'name';
      const whereClause = isProductsTable
        ? `LOWER(${nameColumn}) = LOWER($1)`
        : `LOWER(${nameColumn}) = LOWER($1)`;

      const query = `
        SELECT ${idColumn} AS fruit_id, ${nameColumn} AS name
        FROM ${tableName}
        WHERE ${whereClause}
        LIMIT 1
      `;
      const { rows } = await pool.query(query, [String(name).trim()]);
      return { success: true, data: rows[0] || null };
    } catch (error) {
      return { success: false, error: this._handleDbError('findByName', error) };
    }
  },

  // ── create ────────────────────────────────────────────────────────────────

  async create(data = {}) {
    const required = [
      'name', 'default_storage_type', 'temperature_range_min',
      'temperature_range_max', 'humidity_range', 'default_shelf_life_days'
    ];
    for (const field of required) {
      if (this._isNil(data[field]) || String(data[field]).trim() === '') {
        return { success: false, error: `${field} is required` };
      }
    }

    try {
      const tableResult = await this._resolveCatalogTable();
      if (!tableResult.success) return tableResult;
      const { tableName, columns, idColumn, isProductsTable } = tableResult.data;

      let query, values;

      if (isProductsTable) {
        // Parse humidity_range "85-90%" → min=85, max=90
        const humParts  = String(data.humidity_range).replace('%', '').split('-');
        const humMin    = Number(humParts[0]) || 85;
        const humMax    = Number(humParts[1]) || humMin;

        const hasEthylene  = columns.includes('is_ethylene_producer');
        const hasCompat    = columns.includes('compatible_with');
        const hasAvoid     = columns.includes('avoid_with');
        const hasRipeness  = columns.includes('ripeness_stages');
        const hasUnit      = columns.includes('unit_of_measure');

        const extraCols = [];
        const extraVals = [];
        let   paramIdx  = 8; // params 1–7 are base fields below

        if (hasUnit)     { extraCols.push('unit_of_measure');      extraVals.push(data.unit_of_measure || 'kg');           paramIdx++; }
        if (hasEthylene) { extraCols.push('is_ethylene_producer'); extraVals.push(data.is_ethylene_producer ?? false);     paramIdx++; }
        if (hasCompat)   { extraCols.push('compatible_with');      extraVals.push(data.compatible_with   || []);           paramIdx++; }
        if (hasAvoid)    { extraCols.push('avoid_with');           extraVals.push(data.avoid_with        || []);           paramIdx++; }
        if (hasRipeness) { extraCols.push('ripeness_stages');      extraVals.push(JSON.stringify(data.ripeness_stages || {})); paramIdx++; }

        const extraColStr      = extraCols.length ? ', ' + extraCols.join(', ') : '';
        const extraPlaceholders = extraVals.map((_, i) => `$${8 + i}`).join(', ');
        const extraPlaceholderStr = extraVals.length ? ', ' + extraPlaceholders : '';

        query = `
          INSERT INTO ${tableName} (
            business_id, product_name, product_type, storage_category,
            optimal_temp_min, optimal_temp_max,
            optimal_humidity_min, optimal_humidity_max,
            shelf_life_days
            ${extraColStr}
          )
          VALUES (NULL, $1, 'fruit', $2, $3, $4, $5, $6, $7 ${extraPlaceholderStr})
          RETURNING
            ${idColumn}      AS fruit_id,
            product_name     AS name,
            storage_category AS default_storage_type,
            optimal_temp_min AS temperature_range_min,
            optimal_temp_max AS temperature_range_max,
            shelf_life_days  AS default_shelf_life_days
            ${hasUnit     ? ', unit_of_measure'      : ''}
            ${hasEthylene ? ', is_ethylene_producer' : ''}
            ${hasCompat   ? ', compatible_with'      : ''}
            ${hasAvoid    ? ', avoid_with'           : ''}
            ${hasRipeness ? ', ripeness_stages'      : ''}
        `;

        values = [
          String(data.name).trim(),
          String(data.default_storage_type).trim(),
          data.temperature_range_min,
          data.temperature_range_max,
          humMin,
          humMax,
          data.default_shelf_life_days,
          ...extraVals
        ];
      } else {
        query = `
          INSERT INTO ${tableName} (
            name, default_storage_type,
            temperature_range_min, temperature_range_max,
            humidity_range, default_shelf_life_days
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING
            ${idColumn} AS fruit_id, name, default_storage_type,
            temperature_range_min, temperature_range_max,
            humidity_range, default_shelf_life_days
        `;
        values = [
          String(data.name).trim(),
          String(data.default_storage_type).trim(),
          data.temperature_range_min,
          data.temperature_range_max,
          String(data.humidity_range).trim(),
          data.default_shelf_life_days
        ];
      }

      const { rows } = await pool.query(query, values);
      return { success: true, data: rows[0] };
    } catch (error) {
      return { success: false, error: this._handleDbError('create', error) };
    }
  },

  // ── update ────────────────────────────────────────────────────────────────

  async update(fruitId, data = {}) {
    if (this._isNil(fruitId)) return { success: false, error: 'fruitId is required' };

    try {
      const tableResult = await this._resolveCatalogTable();
      if (!tableResult.success) return tableResult;
      const { tableName, columns, idColumn, isProductsTable } = tableResult.data;

      let query, values;

      if (isProductsTable) {
        const sets   = [];
        const params = [];
        let   idx    = 1;

        const push = (col, val) => { sets.push(`${col} = COALESCE($${idx}, ${col})`); params.push(val); idx++; };

        if (!this._isNil(data.name))                  push('product_name',     String(data.name).trim());
        if (!this._isNil(data.default_storage_type))  push('storage_category', String(data.default_storage_type).trim());
        if (!this._isNil(data.temperature_range_min)) push('optimal_temp_min', Number(data.temperature_range_min));
        if (!this._isNil(data.temperature_range_max)) push('optimal_temp_max', Number(data.temperature_range_max));
        if (!this._isNil(data.default_shelf_life_days)) push('shelf_life_days', Number(data.default_shelf_life_days));

        // humidity_range "85-90%" → split into min/max
        if (!this._isNil(data.humidity_range)) {
          const hp   = String(data.humidity_range).replace('%', '').split('-');
          const hMin = Number(hp[0]) || null;
          const hMax = Number(hp[1]) || hMin;
          if (hMin) { sets.push(`optimal_humidity_min = COALESCE($${idx}, optimal_humidity_min)`); params.push(hMin); idx++; }
          if (hMax) { sets.push(`optimal_humidity_max = COALESCE($${idx}, optimal_humidity_max)`); params.push(hMax); idx++; }
        }

        if (columns.includes('unit_of_measure')      && !this._isNil(data.unit_of_measure))      push('unit_of_measure',      data.unit_of_measure);
        if (columns.includes('is_ethylene_producer') && !this._isNil(data.is_ethylene_producer)) push('is_ethylene_producer', data.is_ethylene_producer);
        if (columns.includes('compatible_with')      && !this._isNil(data.compatible_with))      push('compatible_with',      data.compatible_with);
        if (columns.includes('avoid_with')           && !this._isNil(data.avoid_with))           push('avoid_with',           data.avoid_with);
        if (columns.includes('ripeness_stages')      && !this._isNil(data.ripeness_stages)) {
          sets.push(`ripeness_stages = COALESCE($${idx}::jsonb, ripeness_stages)`);
          params.push(JSON.stringify(data.ripeness_stages));
          idx++;
        }

        if (sets.length === 0) return { success: false, error: 'No fields to update' };

        params.push(fruitId);
        query = `
          UPDATE ${tableName}
          SET ${sets.join(', ')}
          WHERE ${idColumn} = $${idx}
          RETURNING
            ${idColumn}      AS fruit_id,
            product_name     AS name,
            storage_category AS default_storage_type,
            optimal_temp_min AS temperature_range_min,
            optimal_temp_max AS temperature_range_max,
            shelf_life_days  AS default_shelf_life_days
            ${columns.includes('unit_of_measure')      ? ', unit_of_measure'      : ''}
            ${columns.includes('is_ethylene_producer') ? ', is_ethylene_producer' : ''}
            ${columns.includes('compatible_with')      ? ', compatible_with'      : ''}
            ${columns.includes('avoid_with')           ? ', avoid_with'           : ''}
            ${columns.includes('ripeness_stages')      ? ', ripeness_stages'      : ''}
        `;
        values = params;
      } else {
        query = `
          UPDATE ${tableName}
          SET
            name                    = COALESCE($1, name),
            default_storage_type    = COALESCE($2, default_storage_type),
            temperature_range_min   = COALESCE($3, temperature_range_min),
            temperature_range_max   = COALESCE($4, temperature_range_max),
            humidity_range          = COALESCE($5, humidity_range),
            default_shelf_life_days = COALESCE($6, default_shelf_life_days)
          WHERE ${idColumn} = $7
          RETURNING
            ${idColumn} AS fruit_id, name, default_storage_type,
            temperature_range_min, temperature_range_max,
            humidity_range, default_shelf_life_days
        `;
        values = [
          this._isNil(data.name)                   ? null : String(data.name).trim(),
          this._isNil(data.default_storage_type)   ? null : String(data.default_storage_type).trim(),
          this._isNil(data.temperature_range_min)  ? null : data.temperature_range_min,
          this._isNil(data.temperature_range_max)  ? null : data.temperature_range_max,
          this._isNil(data.humidity_range)          ? null : data.humidity_range,
          this._isNil(data.default_shelf_life_days) ? null : data.default_shelf_life_days,
          fruitId
        ];
      }

      const { rows, rowCount } = await pool.query(query, values);
      if (rowCount === 0) return { success: false, error: 'Not found or unauthorized' };
      return { success: true, data: rows[0] };
    } catch (error) {
      return { success: false, error: this._handleDbError('update', error) };
    }
  },

  // ── isUsedInInventory — unchanged ─────────────────────────────────────────

  async isUsedInInventory(fruitId, fruitName) {
    if (this._isNil(fruitId) && (this._isNil(fruitName) || String(fruitName).trim() === '')) {
      return { success: false, error: 'fruitId or fruitName is required' };
    }

    try {
      const productColumns = await this._getColumns('products');
      if (!productColumns.length) return { success: true, data: { used: false } };

      // If the catalog IS the products table, check inventory table instead
      const inventoryColumns = await this._getColumns('inventory');
      if (inventoryColumns.includes('product_id') && !this._isNil(fruitId)) {
        const { rows } = await pool.query(
          `SELECT inventory_id FROM inventory WHERE product_id = $1 LIMIT 1`,
          [fruitId]
        );
        if (rows.length > 0) return { success: true, data: { used: true, reason: 'Used in inventory' } };
      }

      // Fallback: check products table by name for businesses (business_id IS NOT NULL)
      if (productColumns.includes('product_name') && !this._isNil(fruitName)) {
        const { rows } = await pool.query(
          `SELECT product_id FROM products
           WHERE LOWER(product_name) = LOWER($1) AND business_id IS NOT NULL
           LIMIT 1`,
          [String(fruitName).trim()]
        );
        if (rows.length > 0) return { success: true, data: { used: true, reason: 'Product uses this fruit name' } };
      }

      return { success: true, data: { used: false } };
    } catch (error) {
      return { success: false, error: this._handleDbError('isUsedInInventory', error) };
    }
  },

  // ── delete — unchanged ────────────────────────────────────────────────────

  async delete(fruitId) {
    if (this._isNil(fruitId)) return { success: false, error: 'fruitId is required' };

    try {
      const tableResult = await this._resolveCatalogTable();
      if (!tableResult.success) return tableResult;
      const { tableName, idColumn, isProductsTable } = tableResult.data;

      const whereClause = `${idColumn} = $1`;

      const { rows, rowCount } = await pool.query(
        `DELETE FROM ${tableName} WHERE ${whereClause} RETURNING ${idColumn} AS fruit_id`,
        [fruitId]
      );
      if (rowCount === 0) return { success: false, error: 'Not found or unauthorized' };
      return { success: true, data: rows[0] };
    } catch (error) {
      return { success: false, error: this._handleDbError('delete', error) };
    }
  },

  // ── logCatalogChange — unchanged ──────────────────────────────────────────

  async logCatalogChange(payload = {}) {
    try {
      const columns = await this._getAuditColumns();
      if (!columns.length) return { success: false, error: 'audit_logs table not found' };

      const details  = payload.details || `${payload.action || 'catalog_change'} on global fruit catalog`;
      const metadata = JSON.stringify({
        module:     'global_fruit_catalog',
        actor_role: payload.role   || null,
        before:     payload.before || null,
        after:      payload.after  || null,
        timestamp:  new Date().toISOString()
      });

      const valueByColumn = {
        business_id:  null,
        user_id:      payload.userId   || null,
        event_type:   'catalog_change',
        action:       payload.action   || 'catalog_update',
        entity_type:  'fruit_catalog',
        entity_id:    payload.entityId || null,
        reason:       payload.reason   || null,
        details,
        message:      details,
        metadata,
        created_at:   new Date(),
        timestamp:    new Date()
      };

      const insertColumns = columns.filter(c => Object.prototype.hasOwnProperty.call(valueByColumn, c));
      if (!insertColumns.length) return { success: false, error: 'No insertable audit columns found' };

      const values       = insertColumns.map(c => valueByColumn[c]);
      const placeholders = insertColumns.map((_, i) => `$${i + 1}`).join(', ');

      await pool.query(
        `INSERT INTO audit_logs (${insertColumns.join(', ')}) VALUES (${placeholders})`,
        values
      );
      return { success: true, data: true };
    } catch (error) {
      console.error('[CatalogModel.logCatalogChange]', error);
      return { success: false, error: 'Failed to write audit log' };
    }
  }
};

module.exports = CatalogModel;
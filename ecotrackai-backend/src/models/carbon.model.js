const pool = require('../config/database');

const CarbonModel = {
  _isNil(value) {
    return value === null || value === undefined;
  },

  _handleDbError(method, error) {
    console.error(`[CarbonModel.${method}]`, error);
    if (error && error.code === '23503') {
      return 'Foreign key constraint violation';
    }
    return 'Database operation failed';
  },

  _pickColumn(columns, candidates = []) {
    for (const candidate of candidates) {
      if (columns.includes(candidate)) return candidate;
    }
    return null;
  },

  async _getTableColumns(tableName) {
    if (this._isNil(tableName)) {
      return { success: false, error: 'tableName is required' };
    }

    try {
      const query = `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = $1
      `;
      const { rows } = await pool.query(query, [tableName]);
      return { success: true, data: rows.map((row) => row.column_name) };
    } catch (error) {
      return { success: false, error: this._handleDbError('_getTableColumns', error) };
    }
  },

  async findDeliveriesByDateRange(businessId, startDate, endDate) {
    if (this._isNil(businessId)) {
      return { success: false, error: 'businessId is required' };
    }
    if (this._isNil(startDate) || this._isNil(endDate)) {
      return { success: false, error: 'startDate and endDate are required' };
    }

    try {
      const query = `
        SELECT
          dl.route_id,
          dr.vehicle_type,
          COALESCE(dl.actual_distance_km, 0)       AS total_distance,
          COALESCE(dl.actual_fuel_used_liters, 0)  AS fuel_consumption,
          COALESCE(dl.actual_carbon_kg, 0)         AS carbon_emissions,
          dl.created_at,
          'delivered' AS status
        FROM delivery_logs dl
        JOIN delivery_routes dr ON dr.route_id = dl.route_id
        WHERE dr.business_id = $1
          AND dl.delivery_date >= $2
          AND dl.delivery_date <= $3
      `;

      const { rows } = await pool.query(query, [businessId, startDate, endDate]);
      return { success: true, data: rows };
    } catch (error) {
      return { success: false, error: this._handleDbError('findDeliveriesByDateRange', error) };
    }
  },

  async getMonthTotals(businessId, startDate, endDate) {
    if (this._isNil(businessId)) {
      return { success: false, error: 'businessId is required' };
    }
    if (this._isNil(startDate) || this._isNil(endDate)) {
      return { success: false, error: 'startDate and endDate are required' };
    }

    try {
      const query = `
      SELECT
        COUNT(dl.route_id)                          AS trip_count,
        COALESCE(SUM(dl.actual_distance_km), 0)    AS total_distance,
        COALESCE(SUM(dl.actual_fuel_used_liters),0) AS total_fuel,
        COALESCE(SUM(dl.actual_carbon_kg), 0)      AS total_emissions
      FROM delivery_logs dl
      JOIN delivery_routes dr ON dr.route_id = dl.route_id
      WHERE dr.business_id = $1
        AND dl.delivery_date >= $2
        AND dl.delivery_date <= $3
    `;
      const { rows } = await pool.query(query, [businessId, startDate, endDate]);
      return { success: true, data: rows[0] || null };
    } catch (error) {
      return { success: false, error: this._handleDbError('getMonthTotals', error) };
    }
  },

  async findVerificationRecordById(recordId, businessId) {
    if (this._isNil(recordId)) {
      return { success: false, error: 'recordId is required' };
    }
    if (this._isNil(businessId)) {
      return { success: false, error: 'businessId is required' };
    }

    try {
      const columnsResult = await this._getTableColumns('carbon_footprint_records');
      if (!columnsResult.success) return columnsResult;
      const columns = columnsResult.data || [];
      if (!columns.length) {
        return { success: false, error: 'carbon_footprint_records table not available' };
      }

      const idColumn = this._pickColumn(columns, ['record_id', 'carbon_record_id', 'id']);
      if (!idColumn) {
        return { success: false, error: 'carbon_footprint_records id column not found' };
      }

      const statusColumn = this._pickColumn(columns, ['verification_status', 'status']);
      const reviewNotesColumn = this._pickColumn(columns, ['review_notes', 'notes', 'comment']);
      const reviewedByColumn = this._pickColumn(columns, ['verified_by', 'reviewed_by', 'verifier_user_id', 'updated_by']);
      const reviewedAtColumn = this._pickColumn(columns, ['verified_at', 'reviewed_at', 'updated_at']);

      const selectCols = [
        `${idColumn} AS record_id`,
        'business_id',
        ...(statusColumn ? [`${statusColumn} AS verification_status`] : []),
        ...(reviewNotesColumn ? [`${reviewNotesColumn} AS review_notes`] : []),
        ...(reviewedByColumn ? [`${reviewedByColumn} AS reviewed_by`] : []),
        ...(reviewedAtColumn ? [`${reviewedAtColumn} AS reviewed_at`] : [])
      ];

      const query = `
        SELECT ${selectCols.join(', ')}
        FROM carbon_footprint_records
        WHERE ${idColumn} = $1
          AND business_id = $2
      `;
      const { rows } = await pool.query(query, [recordId, businessId]);
      if (rows.length === 0) {
        return { success: false, error: 'Not found or unauthorized' };
      }

      return { success: true, data: rows[0] };
    } catch (error) {
      return { success: false, error: this._handleDbError('findVerificationRecordById', error) };
    }
  },

  async updateVerificationStatus(recordId, businessId, nextStatus, actorUserId, reviewNotes = '') {
    if (this._isNil(recordId)) {
      return { success: false, error: 'recordId is required' };
    }
    if (this._isNil(businessId)) {
      return { success: false, error: 'businessId is required' };
    }
    if (this._isNil(nextStatus) || nextStatus === '') {
      return { success: false, error: 'nextStatus is required' };
    }
    if (this._isNil(actorUserId)) {
      return { success: false, error: 'actorUserId is required' };
    }

    try {
      const columnsResult = await this._getTableColumns('carbon_footprint_records');
      if (!columnsResult.success) return columnsResult;
      const columns = columnsResult.data || [];
      if (!columns.length) {
        return { success: false, error: 'carbon_footprint_records table not available' };
      }

      const idColumn = this._pickColumn(columns, ['record_id', 'carbon_record_id', 'id']);
      if (!idColumn) {
        return { success: false, error: 'carbon_footprint_records id column not found' };
      }

      const statusColumn = this._pickColumn(columns, ['verification_status', 'status']);
      if (!statusColumn) {
        return { success: false, error: 'carbon_footprint_records status column not found' };
      }

      const updates = [];
      const values = [];

      values.push(nextStatus);
      updates.push(`${statusColumn} = $${values.length}`);

      const notesColumn = this._pickColumn(columns, ['review_notes', 'notes', 'comment']);
      if (notesColumn) {
        values.push(reviewNotes || '');
        updates.push(`${notesColumn} = $${values.length}`);
      }

      const reviewedByColumn = this._pickColumn(columns, ['verified_by', 'reviewed_by', 'verifier_user_id', 'updated_by']);
      if (reviewedByColumn) {
        values.push(actorUserId);
        updates.push(`${reviewedByColumn} = $${values.length}`);
      }

      const reviewedAtColumn = this._pickColumn(columns, ['verified_at', 'reviewed_at']);
      if (reviewedAtColumn) {
        values.push(new Date());
        updates.push(`${reviewedAtColumn} = $${values.length}`);
      }

      if (columns.includes('updated_at')) {
        values.push(new Date());
        updates.push(`updated_at = $${values.length}`);
      }

      values.push(recordId);
      const recordParam = values.length;
      values.push(businessId);
      const businessParam = values.length;

      const query = `
        UPDATE carbon_footprint_records
        SET ${updates.join(', ')}
        WHERE ${idColumn} = $${recordParam}
          AND business_id = $${businessParam}
        RETURNING ${idColumn} AS record_id, business_id, ${statusColumn} AS verification_status
      `;
      const { rows, rowCount } = await pool.query(query, values);
      if (rowCount === 0) {
        return { success: false, error: 'Not found or unauthorized' };
      }

      return { success: true, data: rows[0] };
    } catch (error) {
      return { success: false, error: this._handleDbError('updateVerificationStatus', error) };
    }
    
  },
  async getPendingVerifications(businessId) {
    if (!businessId) return [];
    try {
      const { rows } = await pool.query(
        `SELECT 
           cfr.record_id,
           cfr.business_id,
           cfr.route_id,
           cfr.record_type,
           cfr.total_carbon_kg,
           cfr.transportation_carbon_kg,
           cfr.storage_carbon_kg,
           cfr.calculation_method,
           cfr.factors_used,
           cfr.verification_status,
           cfr.is_actual,
           cfr.created_at,
           cfr.calculation_date,
           dr.route_name,
           dr.vehicle_type,
           dr.completed_at,
           dr.total_distance_km        AS actual_distance_km,
           dr.estimated_fuel_consumption_liters AS estimated_fuel_liters,
           dr.estimated_carbon_kg      AS estimated_carbon_kg
         FROM carbon_footprint_records cfr
         LEFT JOIN delivery_routes dr ON dr.route_id = cfr.route_id
         WHERE cfr.business_id = $1
           AND cfr.verification_status = 'pending'
         ORDER BY cfr.created_at DESC`,
        [businessId]
      );
      return rows;
    } catch (error) {
      console.error('[CarbonModel.getPendingVerifications]', error);
      return [];
    }
  },
  
  async getAllByBusiness(businessId) {
    if (!businessId) return [];
    try {
      const { rows } = await pool.query(
        `SELECT 
           cfr.record_id,
           cfr.business_id,
           cfr.route_id,
           cfr.record_type,
           cfr.total_carbon_kg,
           cfr.transportation_carbon_kg,
           cfr.storage_carbon_kg,
           cfr.calculation_method,
           cfr.factors_used,
           cfr.verification_status,
           cfr.is_actual,
           cfr.created_at,
           cfr.revision_notes,
           cfr.verified_by,
           cfr.verified_at,
           dr.route_name,
           dr.vehicle_type,
           dr.total_distance_km        AS actual_distance_km,
           dr.estimated_fuel_consumption_liters AS estimated_fuel_liters
         FROM carbon_footprint_records cfr
         LEFT JOIN delivery_routes dr ON dr.route_id = cfr.route_id
         WHERE cfr.business_id = $1
         ORDER BY cfr.created_at DESC`,
        [businessId]
      );
      return rows;
    } catch (error) {
      console.error('[CarbonModel.getAllByBusiness]', error);
      return [];
    }
  },
  
  async getById(recordId, businessId) {
    if (!recordId || !businessId) return null;
    try {
      const { rows } = await pool.query(
        `SELECT 
           cfr.*,
           dr.route_name,
           dr.vehicle_type,
           dr.completed_at,
           dr.total_distance_km        AS actual_distance_km,
           dr.estimated_fuel_consumption_liters AS estimated_fuel_liters
         FROM carbon_footprint_records cfr
         LEFT JOIN delivery_routes dr ON dr.route_id = cfr.route_id
         WHERE cfr.record_id = $1 AND cfr.business_id = $2`,
        [recordId, businessId]
      );
      return rows[0] || null;
    } catch (error) {
      console.error('[CarbonModel.getById]', error);
      return null;
    }
  },
};


module.exports = CarbonModel;

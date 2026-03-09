const pool = require('../config/database');

const RouteStopsModel = {
  _isNil(value) {
    return value === null || value === undefined;
  },

  _safeNumber(value, fallback = null) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  },

  _safeJsonParse(value, fallback = null) {
    if (typeof value !== 'string') return fallback;
    try {
      return JSON.parse(value);
    } catch (_error) {
      return fallback;
    }
  },

  _pickColumn(columns, candidates = []) {
    for (const candidate of candidates) {
      if (columns.includes(candidate)) return candidate;
    }
    return null;
  },

  _handleDbError(method, error) {
    console.error(`[RouteStopsModel.${method}]`, error);
    if (error && error.code === '23503') return 'Foreign key constraint violation';
    return 'Database operation failed';
  },

  async _getTableColumns(tableName, client = pool) {
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
      const { rows } = await client.query(query, [tableName]);
      return { success: true, data: rows.map((row) => row.column_name) };
    } catch (error) {
      return { success: false, error: this._handleDbError('_getTableColumns', error) };
    }
  },

  _normalizeStopFromRow(row) {
    const lat = this._safeNumber(
      row.latitude
      ?? row.lat
      ?? row.location_lat
      ?? row.stop_lat
      ?? row.geo_lat,
      null
    );
    const lng = this._safeNumber(
      row.longitude
      ?? row.lng
      ?? row.long
      ?? row.location_lng
      ?? row.stop_lng
      ?? row.geo_lng,
      null
    );

    let locationText = row.location_name || row.location || row.stop_name || null;
    if (!locationText && typeof row.location_json === 'string') {
      const parsed = this._safeJsonParse(row.location_json, null);
      if (parsed && typeof parsed === 'object') {
        locationText = parsed.location || parsed.name || null;
      }
    }

    return {
      stop_id: row.stop_id ?? row.route_stop_id ?? row.id ?? null,
      sequence: row.stop_sequence ?? row.sequence_no ?? row.sequence ?? row.stop_order ?? row.order_index ?? null,
      location: locationText,
      latitude: lat,
      longitude: lng,
      status: row.status ?? row.stop_status ?? 'pending',
      is_visited: Boolean(
        row.is_visited
        ?? row.visited
        ?? row.is_completed
        ?? row.completed
        ?? false
      ),
      actual_arrival_time: row.actual_arrival_time ?? row.arrived_at ?? null,
      actual_departure_time: row.actual_departure_time ?? row.departed_at ?? null
    };
  },

  async getRouteById(routeId, businessId) {
    if (this._isNil(routeId)) return { success: false, error: 'routeId is required' };
    if (this._isNil(businessId)) return { success: false, error: 'businessId is required' };

    try {
      const query = `
        SELECT
          route_id,
          business_id,
          route_name,
          driver_name,
          status,
          origin_location,
          destination_location,
          total_distance_km,
          estimated_duration_minutes,
          estimated_fuel_consumption_liters,
          estimated_carbon_kg
        FROM delivery_routes
        WHERE route_id = $1
          AND business_id = $2
      `;
      const { rows } = await pool.query(query, [routeId, businessId]);
      if (rows.length === 0) return { success: false, error: 'Not found or unauthorized' };
      return { success: true, data: rows[0] };
    } catch (error) {
      return { success: false, error: this._handleDbError('getRouteById', error) };
    }
  },

  async getStopsByRoute(routeId, businessId) {
    if (this._isNil(routeId)) return { success: false, error: 'routeId is required' };
    if (this._isNil(businessId)) return { success: false, error: 'businessId is required' };

    try {
      const columnsResult = await this._getTableColumns('route_stops');
      if (!columnsResult.success) return columnsResult;
      const columns = columnsResult.data || [];

      if (!columns.length) {
        const routeResult = await this.getRouteById(routeId, businessId);
        if (!routeResult.success) return routeResult;
        const route = routeResult.data;

        const normalizePoint = (value, fallbackId, fallbackName, fallbackSeq) => {
          let point = value;
          if (typeof point === 'string') point = this._safeJsonParse(point, {});
          if (!point || typeof point !== 'object') point = {};
          return {
            stop_id: fallbackId,
            sequence: fallbackSeq,
            location: point.location || fallbackName,
            latitude: this._safeNumber(point.lat, null),
            longitude: this._safeNumber(point.lng, null),
            status: 'pending',
            is_visited: false,
            actual_arrival_time: null,
            actual_departure_time: null
          };
        };

        return {
          success: true,
          data: [
            normalizePoint(route.origin_location, 'origin', 'Origin', 1),
            normalizePoint(route.destination_location, 'destination', 'Destination', 2)
          ]
        };
      }

      const stopIdCol = this._pickColumn(columns, ['stop_id', 'route_stop_id', 'id']);
      const routeRefCol = this._pickColumn(columns, ['route_id', 'delivery_id']);
      if (!stopIdCol || !routeRefCol) {
        return { success: false, error: 'route_stops required columns not found' };
      }

      const selectCols = [
        stopIdCol,
        routeRefCol,
        ...[
          'stop_sequence', 'sequence_no', 'sequence', 'stop_order', 'order_index',
          'location_name', 'location', 'stop_name', 'location_json',
          'latitude', 'lat', 'location_lat', 'stop_lat', 'geo_lat',
          'longitude', 'lng', 'long', 'location_lng', 'stop_lng', 'geo_lng',
          'status', 'stop_status', 'is_visited', 'visited', 'is_completed', 'completed',
          'actual_arrival_time', 'arrived_at', 'actual_departure_time', 'departed_at'
        ].filter((column) => columns.includes(column))
      ];

      const whereParts = [`${routeRefCol} = $1`];
      const params = [routeId];
      if (columns.includes('business_id')) {
        whereParts.push('business_id = $2');
        params.push(businessId);
      }

      const sequenceCol = this._pickColumn(columns, ['stop_sequence', 'sequence_no', 'sequence', 'stop_order', 'order_index', stopIdCol]);
      const query = `
        SELECT ${selectCols.join(', ')}
        FROM route_stops
        WHERE ${whereParts.join(' AND ')}
        ORDER BY ${sequenceCol} ASC
      `;

      const { rows } = await pool.query(query, params);
      return {
        success: true,
        data: rows.map((row) => this._normalizeStopFromRow(row))
      };
    } catch (error) {
      return { success: false, error: this._handleDbError('getStopsByRoute', error) };
    }
  },

  async getStopById(routeId, businessId, stopId) {
    if (this._isNil(stopId)) return { success: false, error: 'stopId is required' };
    const stopsResult = await this.getStopsByRoute(routeId, businessId);
    if (!stopsResult.success) return stopsResult;

    const stop = (stopsResult.data || []).find((item) => String(item.stop_id) === String(stopId));
    if (!stop) return { success: false, error: 'Not found or unauthorized' };

    return { success: true, data: stop };
  },

  async markStopArrived(routeId, businessId, stopId, arrivedAt = new Date()) {
    if (this._isNil(routeId)) return { success: false, error: 'routeId is required' };
    if (this._isNil(businessId)) return { success: false, error: 'businessId is required' };
    if (this._isNil(stopId)) return { success: false, error: 'stopId is required' };

    try {
      const columnsResult = await this._getTableColumns('route_stops');
      if (!columnsResult.success) return columnsResult;
      const columns = columnsResult.data || [];
      if (!columns.length) return { success: false, error: 'route_stops table not available' };

      const stopIdCol = this._pickColumn(columns, ['stop_id', 'route_stop_id', 'id']);
      const routeRefCol = this._pickColumn(columns, ['route_id', 'delivery_id']);
      if (!stopIdCol || !routeRefCol) {
        return { success: false, error: 'route_stops required columns not found' };
      }

      const updates = [];
      const values = [];

      if (columns.includes('status')) {
        values.push('arrived');
        updates.push(`status = $${values.length}`);
      } else if (columns.includes('stop_status')) {
        values.push('arrived');
        updates.push(`stop_status = $${values.length}`);
      }

      if (columns.includes('actual_arrival_time')) {
        values.push(arrivedAt);
        updates.push(`actual_arrival_time = $${values.length}`);
      } else if (columns.includes('arrived_at')) {
        values.push(arrivedAt);
        updates.push(`arrived_at = $${values.length}`);
      }

      if (columns.includes('is_visited')) {
        values.push(true);
        updates.push(`is_visited = $${values.length}`);
      } else if (columns.includes('visited')) {
        values.push(true);
        updates.push(`visited = $${values.length}`);
      }

      if (columns.includes('updated_at')) {
        values.push(new Date());
        updates.push(`updated_at = $${values.length}`);
      }

      if (!updates.length) return { success: false, error: 'route_stops update columns not available' };

      values.push(routeId);
      const routeParam = values.length;
      values.push(stopId);
      const stopParam = values.length;

      const whereParts = [`${routeRefCol} = $${routeParam}`, `${stopIdCol} = $${stopParam}`];
      if (columns.includes('business_id')) {
        values.push(businessId);
        whereParts.push(`business_id = $${values.length}`);
      }

      const query = `
        UPDATE route_stops
        SET ${updates.join(', ')}
        WHERE ${whereParts.join(' AND ')}
        RETURNING *
      `;
      const { rows, rowCount } = await pool.query(query, values);
      if (rowCount === 0) return { success: false, error: 'Not found or unauthorized' };

      return { success: true, data: rows[0] };
    } catch (error) {
      return { success: false, error: this._handleDbError('markStopArrived', error) };
    }
  },

  async markStopDeparted(routeId, businessId, stopId, departedAt = new Date()) {
    if (this._isNil(routeId)) return { success: false, error: 'routeId is required' };
    if (this._isNil(businessId)) return { success: false, error: 'businessId is required' };
    if (this._isNil(stopId)) return { success: false, error: 'stopId is required' };

    try {
      const columnsResult = await this._getTableColumns('route_stops');
      if (!columnsResult.success) return columnsResult;
      const columns = columnsResult.data || [];
      if (!columns.length) return { success: false, error: 'route_stops table not available' };

      const stopIdCol = this._pickColumn(columns, ['stop_id', 'route_stop_id', 'id']);
      const routeRefCol = this._pickColumn(columns, ['route_id', 'delivery_id']);
      if (!stopIdCol || !routeRefCol) {
        return { success: false, error: 'route_stops required columns not found' };
      }

      const updates = [];
      const values = [];

      if (columns.includes('status')) {
        values.push('departed');
        updates.push(`status = $${values.length}`);
      } else if (columns.includes('stop_status')) {
        values.push('departed');
        updates.push(`stop_status = $${values.length}`);
      }

      if (columns.includes('actual_departure_time')) {
        values.push(departedAt);
        updates.push(`actual_departure_time = $${values.length}`);
      } else if (columns.includes('departed_at')) {
        values.push(departedAt);
        updates.push(`departed_at = $${values.length}`);
      }

      if (columns.includes('updated_at')) {
        values.push(new Date());
        updates.push(`updated_at = $${values.length}`);
      }

      if (!updates.length) return { success: false, error: 'route_stops update columns not available' };

      values.push(routeId);
      const routeParam = values.length;
      values.push(stopId);
      const stopParam = values.length;

      const whereParts = [`${routeRefCol} = $${routeParam}`, `${stopIdCol} = $${stopParam}`];
      if (columns.includes('business_id')) {
        values.push(businessId);
        whereParts.push(`business_id = $${values.length}`);
      }

      const query = `
        UPDATE route_stops
        SET ${updates.join(', ')}
        WHERE ${whereParts.join(' AND ')}
        RETURNING *
      `;
      const { rows, rowCount } = await pool.query(query, values);
      if (rowCount === 0) return { success: false, error: 'Not found or unauthorized' };

      return { success: true, data: rows[0] };
    } catch (error) {
      return { success: false, error: this._handleDbError('markStopDeparted', error) };
    }
  },

  async countUnvisitedStops(routeId, businessId) {
    if (this._isNil(routeId)) return { success: false, error: 'routeId is required' };
    if (this._isNil(businessId)) return { success: false, error: 'businessId is required' };

    const stopsResult = await this.getStopsByRoute(routeId, businessId);
    if (!stopsResult.success) return stopsResult;

    const stops = stopsResult.data || [];
    const unvisited = stops.filter((stop) => {
      const status = String(stop.status || '').toLowerCase();
      if (stop.is_visited) return false;
      if (stop.actual_arrival_time) return false;
      return !['arrived', 'departed', 'completed', 'visited'].includes(status);
    });

    return { success: true, data: unvisited.length };
  },

  async lockRouteAsCompleted(payload = {}) {
    const routeId = payload.routeId;
    const businessId = payload.businessId;
    if (this._isNil(routeId)) return { success: false, error: 'routeId is required' };
    if (this._isNil(businessId)) return { success: false, error: 'businessId is required' };

    try {
      const columnsResult = await this._getTableColumns('delivery_routes');
      if (!columnsResult.success) return columnsResult;
      const columns = columnsResult.data || [];
      if (!columns.length) return { success: false, error: 'delivery_routes table not available' };

      const updates = [];
      const values = [];

      if (columns.includes('status')) {
        values.push('completed');
        updates.push(`status = $${values.length}`);
      }

      if (columns.includes('actual_distance_km') && !this._isNil(payload.actualDistanceKm)) {
        values.push(payload.actualDistanceKm);
        updates.push(`actual_distance_km = $${values.length}`);
      }
      if (columns.includes('actual_fuel_used_liters') && !this._isNil(payload.actualFuelUsedLiters)) {
        values.push(payload.actualFuelUsedLiters);
        updates.push(`actual_fuel_used_liters = $${values.length}`);
      }
      if (columns.includes('actual_duration_minutes') && !this._isNil(payload.actualDurationMinutes)) {
        values.push(payload.actualDurationMinutes);
        updates.push(`actual_duration_minutes = $${values.length}`);
      }

      if (columns.includes('completed_at')) {
        values.push(payload.completedAt || new Date());
        updates.push(`completed_at = $${values.length}`);
      }

      if (columns.includes('route_locked')) {
        values.push(true);
        updates.push(`route_locked = $${values.length}`);
      } else if (columns.includes('is_locked')) {
        values.push(true);
        updates.push(`is_locked = $${values.length}`);
      } else if (columns.includes('locked')) {
        values.push(true);
        updates.push(`locked = $${values.length}`);
      }

      if (columns.includes('locked_at')) {
        values.push(new Date());
        updates.push(`locked_at = $${values.length}`);
      }

      if (columns.includes('updated_at')) {
        values.push(new Date());
        updates.push(`updated_at = $${values.length}`);
      }

      if (!updates.length) return { success: false, error: 'No updatable delivery route columns found' };

      values.push(routeId);
      values.push(businessId);
      const query = `
        UPDATE delivery_routes
        SET ${updates.join(', ')}
        WHERE route_id = $${values.length - 1}
          AND business_id = $${values.length}
        RETURNING *
      `;
      const { rows, rowCount } = await pool.query(query, values);
      if (rowCount === 0) return { success: false, error: 'Not found or unauthorized' };

      return { success: true, data: rows[0] };
    } catch (error) {
      return { success: false, error: this._handleDbError('lockRouteAsCompleted', error) };
    }
  },

  async createDeliveryLog(payload = {}) {
    if (this._isNil(payload.routeId)) return { success: false, error: 'routeId is required' };
    if (this._isNil(payload.businessId)) return { success: false, error: 'businessId is required' };

    try {
      const columnsResult = await this._getTableColumns('delivery_logs');
      if (!columnsResult.success) return columnsResult;
      const columns = columnsResult.data || [];
      if (!columns.length) return { success: false, error: 'delivery_logs table not available' };

      const valueByColumn = {
        route_id: payload.routeId,
        delivery_id: payload.routeId,
        business_id: payload.businessId,
        driver_user_id: payload.driverUserId || null,
        user_id: payload.driverUserId || null,
        actual_distance_km: payload.actualDistanceKm,
        distance_km: payload.actualDistanceKm,
        actual_fuel_used_liters: payload.actualFuelUsedLiters,
        fuel_used_liters: payload.actualFuelUsedLiters,
        actual_duration_minutes: payload.actualDurationMinutes || null,
        duration_minutes: payload.actualDurationMinutes || null,
        notes: payload.notes || null,
        issues: payload.notes || null,
        status: 'completed',
        created_at: new Date(),
        updated_at: new Date()
      };

      const insertColumns = columns.filter((column) =>
        Object.prototype.hasOwnProperty.call(valueByColumn, column)
      );

      const hasRouteRef = insertColumns.includes('route_id') || insertColumns.includes('delivery_id');
      if (!hasRouteRef) return { success: false, error: 'delivery_logs route reference column not found' };
      if (!insertColumns.includes('business_id')) return { success: false, error: 'delivery_logs business_id column not found' };

      const placeholders = insertColumns.map((_, idx) => `$${idx + 1}`).join(', ');
      const values = insertColumns.map((column) => valueByColumn[column]);
      const query = `
        INSERT INTO delivery_logs (${insertColumns.join(', ')})
        VALUES (${placeholders})
        RETURNING *
      `;
      const { rows } = await pool.query(query, values);
      return { success: true, data: rows[0] || null };
    } catch (error) {
      return { success: false, error: this._handleDbError('createDeliveryLog', error) };
    }
  },

  async createCarbonRecord(payload = {}) {
    if (this._isNil(payload.routeId)) return { success: false, error: 'routeId is required' };
    if (this._isNil(payload.businessId)) return { success: false, error: 'businessId is required' };
    if (this._isNil(payload.totalCarbonKg)) return { success: false, error: 'totalCarbonKg is required' };

    try {
      const columnsResult = await this._getTableColumns('carbon_footprint_records');
      if (!columnsResult.success) return columnsResult;
      const columns = columnsResult.data || [];
      if (!columns.length) return { success: false, error: 'carbon_footprint_records table not available' };

      const valueByColumn = {
        business_id: payload.businessId,
        record_type: 'delivery',
        related_record_type: 'delivery_route',
        related_record_id: payload.routeId,
        route_id: payload.routeId,
        delivery_id: payload.routeId,
        delivery_log_id: payload.deliveryLogId || null,
        transportation_carbon_kg: payload.totalCarbonKg,
        storage_carbon_kg: 0,
        total_carbon_kg: payload.totalCarbonKg,
        fuel_used_liters: payload.actualFuelUsedLiters || null,
        distance_km: payload.actualDistanceKm || null,
        verification_status: 'pending',
        is_actual: true,
        calculation_method: 'fuel_based',
        factors_used: JSON.stringify({
          co2_per_liter: payload.co2PerLiter || null,
          source: 'driver_completion'
        }),
        notes: 'Auto-generated from completed delivery',
        created_at: new Date(),
        updated_at: new Date()
      };

      const insertColumns = columns.filter((column) =>
        Object.prototype.hasOwnProperty.call(valueByColumn, column)
      );

      if (!insertColumns.includes('business_id')) {
        return { success: false, error: 'carbon_footprint_records business_id column not found' };
      }

      const placeholders = insertColumns.map((_, idx) => `$${idx + 1}`).join(', ');
      const values = insertColumns.map((column) => valueByColumn[column]);
      const query = `
        INSERT INTO carbon_footprint_records (${insertColumns.join(', ')})
        VALUES (${placeholders})
        RETURNING *
      `;
      const { rows } = await pool.query(query, values);
      return { success: true, data: rows[0] || null };
    } catch (error) {
      return { success: false, error: this._handleDbError('createCarbonRecord', error) };
    }
  }
};

module.exports = RouteStopsModel;

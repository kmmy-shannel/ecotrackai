const pool = require('../config/database');

const ALLOWED_COLUMNS = new Set([
  'business_id',
  'user_id',
  'event_type',
  'action',
  'entity_type',
  'entity_id',
  'status_from',
  'status_to',
  'reason',
  'details',
  'message',
  'metadata',
  'created_at',
  'timestamp'
]);

const AuditModel = {
  async _getAuditColumns() {
    try {
      const query = `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'audit_logs'
          AND table_schema = current_schema()
      `;
      const { rows } = await pool.query(query);
      return rows.map((row) => row.column_name).filter((name) => ALLOWED_COLUMNS.has(name));
    } catch (error) {
      console.error('[AuditModel._getAuditColumns]', error);
      return [];
    }
  },

  async logInvalidStatusTransition(payload = {}) {
    try {
      const columns = await this._getAuditColumns();
      if (!columns.length) {
        return { success: false, error: 'audit_logs table or compatible columns not found' };
      }

      const metadata = {
        workflow: payload.workflow || null,
        entity_type: payload.entityType || null,
        entity_id: payload.entityId || null,
        from_status: payload.fromStatus || null,
        to_status: payload.toStatus || null,
        reason: payload.reason || null,
        attempted_by_role: payload.role || null,
        timestamp: new Date().toISOString()
      };

      const valueByColumn = {
        business_id: payload.businessId || null,
        user_id: payload.userId || null,
        event_type: 'invalid_status_transition',
        action: 'invalid_status_transition',
        entity_type: payload.entityType || null,
        entity_id: payload.entityId || null,
        status_from: payload.fromStatus || null,
        status_to: payload.toStatus || null,
        reason: payload.reason || 'Invalid status transition attempt',
        details: payload.reason || 'Invalid status transition attempt',
        message: payload.reason || 'Invalid status transition attempt',
        metadata: JSON.stringify(metadata),
        created_at: new Date(),
        timestamp: new Date()
      };

      const insertColumns = columns.filter((col) => Object.prototype.hasOwnProperty.call(valueByColumn, col));
      if (!insertColumns.length) {
        return { success: false, error: 'No insertable audit columns found' };
      }

      const placeholders = insertColumns.map((_, index) => `$${index + 1}`).join(', ');
      const values = insertColumns.map((col) => valueByColumn[col]);

      const query = `
        INSERT INTO audit_logs (${insertColumns.join(', ')})
        VALUES (${placeholders})
      `;

      await pool.query(query, values);
      return { success: true, data: true };
    } catch (error) {
      console.error('[AuditModel.logInvalidStatusTransition]', error);
      return { success: false, error: 'Failed to write audit log' };
    }
  }
};

module.exports = AuditModel;

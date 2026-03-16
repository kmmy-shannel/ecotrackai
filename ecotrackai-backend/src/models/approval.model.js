const pool = require('../config/database');

const ApprovalModel = {
  _isNil(value) {
    return value === null || value === undefined;
  },

  _handleDbError(method, error) {
    console.error(`[ApprovalModel.${method}]`, error);
    if (error && error.code === '23503') {
      return 'Foreign key constraint violation';
    }
    return 'Database operation failed';
  },

  async findByBusinessAndStatus(businessId, status) {
    if (this._isNil(businessId)) {
      return { success: false, error: 'businessId is required' };
    }
    if (this._isNil(status)) {
      return { success: false, error: 'status is required' };
    }

    try {
      const query = `
        SELECT *, approval_id AS id
        FROM manager_approvals
        WHERE business_id = $1
          AND status = $2
        ORDER BY
          CASE priority
            WHEN 'HIGH' THEN 1
            WHEN 'MEDIUM' THEN 2
            WHEN 'LOW' THEN 3
            ELSE 4
          END,
          created_at DESC NULLS LAST
      `;

      const { rows } = await pool.query(query, [businessId, status]);
      return { success: true, data: rows };
    } catch (error) {
      return { success: false, error: this._handleDbError('findByBusinessAndStatus', error) };
    }
  },

  async findByBusinessRoleAndStatus(businessId, role, status) {
    if (this._isNil(businessId)) {
      return { success: false, error: 'businessId is required' };
    }
    if (this._isNil(role)) {
      return { success: false, error: 'role is required' };
    }
    if (this._isNil(status)) {
      return { success: false, error: 'status is required' };
    }

    try {
      const query = `
        SELECT *, approval_id AS id
        FROM manager_approvals
        WHERE business_id = $1
          AND required_role = $2
          AND status = $3
        ORDER BY
          CASE priority
            WHEN 'HIGH' THEN 1
            WHEN 'MEDIUM' THEN 2
            WHEN 'LOW' THEN 3
            ELSE 4
          END,
          created_at DESC NULLS LAST
      `;

      const { rows } = await pool.query(query, [businessId, role, status]);
      return { success: true, data: rows };
    } catch (error) {
      return { success: false, error: this._handleDbError('findByBusinessRoleAndStatus', error) };
    }
  },

  async countPendingByBusinessAndRole(businessId, role) {
    if (this._isNil(businessId)) {
      return { success: false, error: 'businessId is required' };
    }
    if (this._isNil(role)) {
      return { success: false, error: 'role is required' };
    }

    try {
      const query = `
        SELECT COUNT(*) AS count
        FROM manager_approvals
        WHERE business_id = $1
          AND required_role = $2
          AND status = 'pending'
      `;

      const { rows } = await pool.query(query, [businessId, role]);
      return { success: true, data: parseInt(rows[0].count, 10) || 0 };
    } catch (error) {
      return { success: false, error: this._handleDbError('countPendingByBusinessAndRole', error) };
    }
  },

  async findByIdAndRole(approvalId, role, businessId) {
    if (this._isNil(approvalId)) {
      return { success: false, error: 'approvalId is required' };
    }
    if (this._isNil(role)) {
      return { success: false, error: 'role is required' };
    }
    if (this._isNil(businessId)) {
      return { success: false, error: 'businessId is required' };
    }

    try {
      const query = `
        SELECT *, approval_id AS id
        FROM manager_approvals
        WHERE approval_id = $1
          AND required_role = $2
          AND business_id = $3
      `;

      const { rows } = await pool.query(query, [approvalId, role, businessId]);
      if (rows.length === 0) {
        return { success: false, error: 'Not found or unauthorized' };
      }

      return { success: true, data: rows[0] };
    } catch (error) {
      return { success: false, error: this._handleDbError('findByIdAndRole', error) };
    }
  },

  async findHistoryByBusinessAndRole(businessId, role, limit = 50) {
    if (this._isNil(businessId)) {
      return { success: false, error: 'businessId is required' };
    }
    if (this._isNil(role)) {
      return { success: false, error: 'role is required' };
    }

    try {
      const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
      const query = `
        SELECT *, approval_id AS id
        FROM manager_approvals
        WHERE business_id = $1
          AND required_role = $2
          AND status IN ('approved', 'rejected')
        ORDER BY COALESCE(reviewed_at, decision_date, created_at) DESC NULLS LAST
        LIMIT $3
      `;

      const { rows } = await pool.query(query, [businessId, role, safeLimit]);
      return { success: true, data: rows };
    } catch (error) {
      return { success: false, error: this._handleDbError('findHistoryByBusinessAndRole', error) };
    }
  },

  async create(data) {
    if (!data || typeof data !== 'object') {
      return { success: false, error: 'data is required' };
    }
    if (this._isNil(data.businessId)) {
      return { success: false, error: 'businessId is required' };
    }
    if (this._isNil(data.submittedBy)) {
      return { success: false, error: 'submittedBy is required' };
    }

    try {
      const query = `
        INSERT INTO manager_approvals (
          business_id, product_name, quantity, location, days_left,
          risk_level, ai_suggestion, priority, required_role,
          approval_type, submitted_by, extra_data, delivery_id, alert_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `;

      const values = [
        data.businessId,
        data.productName,
        data.quantity || 'N/A',
        data.location || 'N/A',
        data.daysLeft || 0,
        data.riskLevel || 'MEDIUM',
        data.aiSuggestion || '',
        data.priority || 'MEDIUM',
        data.requiredRole || 'inventory_manager',
        data.approvalType || 'spoilage_action',
        data.submittedBy,
        data.extraData || null,
        data.deliveryId || null,
        data.alertId || null
      ];

      const { rows } = await pool.query(query, values);
      return { success: true, data: rows[0] };
    } catch (error) {
      return { success: false, error: this._handleDbError('create', error) };
    }
  },

  async updateStatusWithRole(approvalId, businessId, status, reviewedBy, notes, decidedByRole) {
    if (this._isNil(approvalId)) {
      return { success: false, error: 'approvalId is required' };
    }
    if (this._isNil(businessId)) {
      return { success: false, error: 'businessId is required' };
    }
    if (this._isNil(status)) {
      return { success: false, error: 'status is required' };
    }
    if (this._isNil(reviewedBy)) {
      return { success: false, error: 'reviewedBy is required' };
    }

    try {
      const query = `
        UPDATE manager_approvals
        SET status = $1,
            reviewed_by = $2,
            reviewed_at = NOW(),
            review_notes = $3,
            decided_by_role = $4,
            decision = $1,
            decision_notes = $3,
            decision_date = NOW(),
            manager_user_id = $2
        WHERE approval_id = $5
          AND business_id = $6
        RETURNING approval_id
      `;

      const { rows, rowCount } = await pool.query(query, [
        status,
        reviewedBy,
        notes || '',
        decidedByRole || '',
        approvalId,
        businessId
      ]);

      if (rowCount === 0) {
        return { success: false, error: 'Not found or unauthorized' };
      }

      return { success: true, data: rows[0] };
    } catch (error) {
      return { success: false, error: this._handleDbError('updateStatusWithRole', error) };
    }
  },

  async requestAdminReview(approvalId, businessId, managerComment) {
    if (this._isNil(approvalId)) {
      return { success: false, error: 'approvalId is required' };
    }
    if (this._isNil(businessId)) {
      return { success: false, error: 'businessId is required' };
    }

    try {
      const query = `
        UPDATE manager_approvals
        SET status = 'pending_admin',
            manager_comment = $1,
            escalated_at = NOW()
        WHERE approval_id = $2
          AND business_id = $3
        RETURNING approval_id
      `;

      const { rows, rowCount } = await pool.query(query, [managerComment || '', approvalId, businessId]);
      if (rowCount === 0) {
        return { success: false, error: 'Not found or unauthorized' };
      }

      return { success: true, data: rows[0] };
    } catch (error) {
      return { success: false, error: this._handleDbError('requestAdminReview', error) };
    }
  },

  async findAdminRequests(businessId) {
    if (this._isNil(businessId)) {
      return { success: false, error: 'businessId is required' };
    }

    try {
      const query = `
        SELECT *, approval_id AS id
        FROM manager_approvals
        WHERE business_id = $1
          AND status = 'pending_admin'
        ORDER BY escalated_at DESC NULLS LAST
      `;

      const { rows } = await pool.query(query, [businessId]);
      return { success: true, data: rows };
    } catch (error) {
      return { success: false, error: this._handleDbError('findAdminRequests', error) };
    }
  },

  async adminReviewRequest(approvalId, businessId, decision, adminComment, adminUserId) {
    if (this._isNil(approvalId)) {
      return { success: false, error: 'approvalId is required' };
    }
    if (this._isNil(businessId)) {
      return { success: false, error: 'businessId is required' };
    }
    if (this._isNil(decision)) {
      return { success: false, error: 'decision is required' };
    }
    if (this._isNil(adminUserId)) {
      return { success: false, error: 'adminUserId is required' };
    }

    try {
      const query = `
        UPDATE manager_approvals
        SET status = $1,
            admin_comment = $2,
            reviewed_by = $3,
            reviewed_at = NOW(),
            review_notes = $2,
            decision = $1,
            decision_date = NOW()
        WHERE approval_id = $4
          AND business_id = $5
        RETURNING approval_id
      `;

      const { rows, rowCount } = await pool.query(query, [
        decision,
        adminComment || '',
        adminUserId,
        approvalId,
        businessId
      ]);

      if (rowCount === 0) {
        return { success: false, error: 'Not found or unauthorized' };
      }

      return { success: true, data: rows[0] };
    } catch (error) {
      return { success: false, error: this._handleDbError('adminReviewRequest', error) };
    }
  },

  async findById(approvalId, businessId) {
    if (this._isNil(approvalId)) {
      return { success: false, error: 'approvalId is required' };
    }
    if (this._isNil(businessId)) {
      return { success: false, error: 'businessId is required' };
    }

    try {
      const query = `
        SELECT *
        FROM manager_approvals
        WHERE approval_id = $1
          AND business_id = $2
      `;

      const { rows } = await pool.query(query, [approvalId, businessId]);
      if (rows.length === 0) {
        return { success: false, error: 'Not found or unauthorized' };
      }

      return { success: true, data: rows[0] };
    } catch (error) {
      return { success: false, error: this._handleDbError('findById', error) };
    }
  },

  async _getTableColumns(client, tableName) {
    if (!client) {
      return { success: false, error: 'client is required' };
    }
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

  async _resolveEcoAction(client, actionRef) {
    if (!client) {
      return { success: false, error: 'client is required' };
    }
    if (this._isNil(actionRef)) {
      return { success: false, error: 'actionRef is required' };
    }

    try {
      const columnResult = await this._getTableColumns(client, 'sustainable_actions');
      if (!columnResult.success || !Array.isArray(columnResult.data) || columnResult.data.length === 0) {
        return { success: false, error: 'sustainable_actions table not found' };
      }

      const columns = columnResult.data;
      if (!columns.includes('action_id')) {
        return { success: false, error: 'sustainable_actions.action_id not found' };
      }

      const pointColumn = ['points_value', 'point_value', 'points'].find((col) => columns.includes(col));

      if (!this._isNil(actionRef) && String(actionRef).match(/^\d+$/)) {
        const numericActionId = parseInt(actionRef, 10);
        const query = `
          SELECT action_id${pointColumn ? `, ${pointColumn} AS points_value` : ''}
          FROM sustainable_actions
          WHERE action_id = $1
          LIMIT 1
        `;
        const { rows } = await client.query(query, [numericActionId]);
        if (rows.length > 0) {
          return {
            success: true,
            data: {
              actionId: rows[0].action_id,
              pointsValue: pointColumn ? rows[0].points_value : null
            }
          };
        }
      }

      const matchColumns = ['action_key', 'action_code', 'action_name', 'name', 'action_type']
        .filter((col) => columns.includes(col));

      for (const matchColumn of matchColumns) {
        const query = `
          SELECT action_id${pointColumn ? `, ${pointColumn} AS points_value` : ''}
          FROM sustainable_actions
          WHERE ${matchColumn} = $1
          LIMIT 1
        `;
        const { rows } = await client.query(query, [String(actionRef)]);
        if (rows.length > 0) {
          return {
            success: true,
            data: {
              actionId: rows[0].action_id,
              pointsValue: pointColumn ? rows[0].points_value : null
            }
          };
        }
      }

      return { success: false, error: 'Unable to resolve action_id' };
    } catch (error) {
      return { success: false, error: this._handleDbError('_resolveEcoAction', error) };
    }
  },

  async _recalculateEcoTrustScore(client, businessId) {
    if (!client) {
      return { success: false, error: 'client is required' };
    }
    if (this._isNil(businessId)) {
      return { success: false, error: 'businessId is required' };
    }

    try {
      const txColumnsResult = await this._getTableColumns(client, 'ecotrust_transactions');
      if (!txColumnsResult.success) return txColumnsResult;
      const txColumns = txColumnsResult.data || [];

      const scoresColumnsResult = await this._getTableColumns(client, 'ecotrust_scores');
      if (!scoresColumnsResult.success) return scoresColumnsResult;
      const scoreColumns = scoresColumnsResult.data || [];

      if (!txColumns.includes('business_id') || !txColumns.includes('points_earned')) {
        return { success: false, error: 'ecotrust_transactions required columns not found' };
      }
      if (!scoreColumns.includes('business_id')) {
        return { success: false, error: 'ecotrust_scores required columns not found' };
      }

      let verifiedCondition = 'AND 1 = 0';
      if (txColumns.includes('verification_status')) {
        verifiedCondition = "AND verification_status = 'verified'";
      } else if (txColumns.includes('is_verified')) {
        verifiedCondition = 'AND is_verified = TRUE';
      }

      const sumQuery = `
        SELECT COALESCE(SUM(points_earned), 0) AS total_points
        FROM ecotrust_transactions
        WHERE business_id = $1
          ${verifiedCondition}
      `;
      const sumResult = await client.query(sumQuery, [businessId]);
      const totalPoints = parseFloat(sumResult.rows[0]?.total_points || 0);

      const scoreField = ['current_score', 'total_points', 'score'].find((col) => scoreColumns.includes(col));
      if (!scoreField) {
        return { success: true, data: { totalPoints } };
      }

      const updateSegments = [`${scoreField} = $1`];
      if (scoreColumns.includes('updated_at')) {
        updateSegments.push('updated_at = NOW()');
      }

      const updateQuery = `
        UPDATE ecotrust_scores
        SET ${updateSegments.join(', ')}
        WHERE business_id = $2
        RETURNING business_id
      `;
      const updateResult = await client.query(updateQuery, [totalPoints, businessId]);

      if (updateResult.rowCount === 0) {
        const insertColumns = ['business_id', scoreField];
        const insertValues = [businessId, totalPoints];
        const insertPlaceholders = insertColumns.map((_, index) => `$${index + 1}`).join(', ');
        const insertQuery = `
          INSERT INTO ecotrust_scores (${insertColumns.join(', ')})
          VALUES (${insertPlaceholders})
          RETURNING business_id
        `;
        await client.query(insertQuery, insertValues);
      }

      return { success: true, data: { totalPoints } };
    } catch (error) {
      return { success: false, error: this._handleDbError('_recalculateEcoTrustScore', error) };
    }
  },

  async findEcoTrustTransactionByApproval(approvalId, businessId) {
    if (this._isNil(approvalId)) {
      return { success: false, error: 'approvalId is required' };
    }
    if (this._isNil(businessId)) {
      return { success: false, error: 'businessId is required' };
    }

    try {
      const query = `
        SELECT *
        FROM ecotrust_transactions
        WHERE business_id = $1
          AND related_record_id = $2
          AND related_record_type IN ('approval', 'manager_approval')
        ORDER BY created_at DESC NULLS LAST
        LIMIT 1
      `;
      const { rows } = await pool.query(query, [businessId, approvalId]);
      return { success: true, data: rows[0] || null };
    } catch (error) {
      return { success: false, error: this._handleDbError('findEcoTrustTransactionByApproval', error) };
    }
  },

  async createEcoTrustTransaction(payload) {
    if (!payload || typeof payload !== 'object') {
      return { success: false, error: 'payload is required' };
    }
    if (this._isNil(payload.businessId)) {
      return { success: false, error: 'businessId is required' };
    }

    const relatedRecordType = payload.relatedRecordType || 'manager_approval';
    const relatedRecordId = payload.relatedRecordId || payload.approvalId || null;
    if (this._isNil(relatedRecordId)) {
      return { success: false, error: 'relatedRecordId is required' };
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const txColumnsResult = await this._getTableColumns(client, 'ecotrust_transactions');
      if (!txColumnsResult.success) {
        await client.query('ROLLBACK');
        return txColumnsResult;
      }
      const txColumns = txColumnsResult.data || [];
      const requiredColumns = ['business_id', 'action_id', 'related_record_type', 'related_record_id'];
      if (!requiredColumns.every((column) => txColumns.includes(column))) {
        await client.query('ROLLBACK');
        return { success: false, error: 'ecotrust_transactions required columns not found' };
      }

      let resolvedActionId = payload.actionId || null;
let resolvedPoints = payload.pointsEarned;

if (this._isNil(resolvedActionId)) {
  const actionRef = payload.actionType || payload.action_id || null;
  if (this._isNil(actionRef)) {
    await client.query('ROLLBACK');
    return { success: false, error: 'action_id or actionType is required' };
  }

  // ── NEW: Map actionType string to sustainable_actions category ──
  const categoryMap = {
    'spoilage_action':            'spoilage_prevention',
    'approval_approved':          'spoilage_prevention',
    'route_optimization':         'delivery_optimization',
    'approval_approved_by_admin': 'spoilage_prevention',
    'carbon_verified':            'carbon_verification',
    'carbon_verification':        'carbon_verification',
    'on_time_delivery':           'on_time_delivery',
  };

  const mappedCategory = categoryMap[actionRef] || null;

  if (mappedCategory) {
    // Look up action_id AND points_value from sustainable_actions by category
    const categoryLookup = await client.query(
      `SELECT action_id, points_value
       FROM sustainable_actions
       WHERE action_category = $1
       ORDER BY action_id DESC
       LIMIT 1`,
      [mappedCategory]
    );

    if (categoryLookup.rows.length > 0) {
      resolvedActionId = categoryLookup.rows[0].action_id;
      if (this._isNil(resolvedPoints)) {
        resolvedPoints = categoryLookup.rows[0].points_value;
      }
    }
  }

  // ── Fallback: original resolver if category map didn't find anything ──
  if (this._isNil(resolvedActionId)) {
    const actionResult = await this._resolveEcoAction(client, actionRef);
    if (!actionResult.success) {
      await client.query('ROLLBACK');
      return actionResult;
    }
    resolvedActionId = actionResult.data.actionId;
    if (this._isNil(resolvedPoints) && !this._isNil(actionResult.data.pointsValue)) {
      resolvedPoints = actionResult.data.pointsValue;
    }
  }
}
      const duplicateQuery = `
        SELECT *
        FROM ecotrust_transactions
        WHERE business_id = $1
          AND action_id = $2
          AND related_record_type = $3
          AND related_record_id = $4
        LIMIT 1
      `;
      const duplicateResult = await client.query(duplicateQuery, [
        payload.businessId,
        resolvedActionId,
        relatedRecordType,
        relatedRecordId
      ]);

      if (duplicateResult.rows.length > 0) {
        await client.query('COMMIT');
        return { success: true, data: duplicateResult.rows[0] };
      }

      const verificationStatus = payload.verificationStatus || 'pending';
      const valueByColumn = {
        business_id: payload.businessId,
        action_id: resolvedActionId,
        related_record_type: relatedRecordType,
        related_record_id: relatedRecordId,
        points_earned: this._isNil(resolvedPoints) ? 0 : resolvedPoints,
        verification_status: verificationStatus,
        is_verified: verificationStatus === 'verified',
        awarded_by: payload.actorUserId || null,
        created_by: payload.actorUserId || null,
        user_id: payload.actorUserId || null,
        status: verificationStatus,
        notes: payload.notes || null,
        metadata: JSON.stringify({
          actionType: payload.actionType || null,
          source: payload.source || 'approval_service',
          createdAt: new Date().toISOString()
        }),
        created_at: new Date(),
        updated_at: new Date()
      };

      const insertColumns = txColumns.filter((column) =>
        Object.prototype.hasOwnProperty.call(valueByColumn, column)
      );
      const insertValues = insertColumns.map((column) => valueByColumn[column]);
      const placeholders = insertColumns.map((_, index) => `$${index + 1}`).join(', ');

      const insertQuery = `
        INSERT INTO ecotrust_transactions (${insertColumns.join(', ')})
        VALUES (${placeholders})
        RETURNING *
      `;
      const insertResult = await client.query(insertQuery, insertValues);

      const recalcResult = await this._recalculateEcoTrustScore(client, payload.businessId);
      if (!recalcResult.success) {
        await client.query('ROLLBACK');
        return recalcResult;
      }

      await client.query('COMMIT');
      return { success: true, data: insertResult.rows[0] };
    } catch (error) {
      await client.query('ROLLBACK');
      return { success: false, error: this._handleDbError('createEcoTrustTransaction', error) };
    } finally {
      client.release();
    }
  },

  async verifyEcoTrustTransaction(payload) {
    if (!payload || typeof payload !== 'object') {
      return { success: false, error: 'payload is required' };
    }
    if (this._isNil(payload.businessId)) {
      return { success: false, error: 'businessId is required' };
    }
    if (this._isNil(payload.transactionId)) {
      return { success: false, error: 'transactionId is required' };
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const query = `
        UPDATE ecotrust_transactions
        SET verification_status = 'verified',
            is_verified = TRUE
        WHERE transaction_id = $1
          AND business_id = $2
        RETURNING transaction_id
      `;
      const { rows, rowCount } = await client.query(query, [payload.transactionId, payload.businessId]);
      if (rowCount === 0) {
        await client.query('ROLLBACK');
        return { success: false, error: 'Not found or unauthorized' };
      }

      const recalcResult = await this._recalculateEcoTrustScore(client, payload.businessId);
      if (!recalcResult.success) {
        await client.query('ROLLBACK');
        return recalcResult;
      }

      await client.query('COMMIT');
      return { success: true, data: rows[0] };
    } catch (error) {
      await client.query('ROLLBACK');
      return { success: false, error: this._handleDbError('verifyEcoTrustTransaction', error) };
    } finally {
      client.release();
    }
  },

  async createApprovalHistory(payload) {
    if (!payload || typeof payload !== 'object') {
      return { success: false, error: 'payload is required' };
    }

    try {
      const columnResult = await this._getTableColumns(pool, 'approval_history');
      if (!columnResult.success) return columnResult;
      const columns = columnResult.data || [];
      if (!columns.length) {
        return { success: true, data: null };
      }

      const now = new Date();
      const valueByColumn = {
        approval_id: payload.approvalId || null,
        business_id: payload.businessId || null,
        actor_user_id: payload.actorUserId || null,
        user_id: payload.actorUserId || null,
        actor_role: payload.actorRole || null,
        action: payload.action || null,
        decision: payload.action || null,
        notes: payload.notes || null,
        comment: payload.notes || null,
        status: payload.status || null,
        related_record_type: payload.relatedRecordType || null,
        related_record_id: payload.relatedRecordId || null,
        metadata: payload.metadata ? JSON.stringify(payload.metadata) : null,
        created_at: now,
        decision_date: now,
        timestamp: now
      };

      const insertColumns = columns.filter((col) =>
        Object.prototype.hasOwnProperty.call(valueByColumn, col)
      );
      if (!insertColumns.length) {
        return { success: true, data: null };
      }

      const placeholders = insertColumns.map((_, idx) => `$${idx + 1}`).join(', ');
      const values = insertColumns.map((col) => valueByColumn[col]);
      const query = `
        INSERT INTO approval_history (${insertColumns.join(', ')})
        VALUES (${placeholders})
        RETURNING *
      `;
      const { rows } = await pool.query(query, values);
      return { success: true, data: rows[0] || null };
    } catch (error) {
      return { success: false, error: this._handleDbError('createApprovalHistory', error) };
    }
  },

  async logApprovalHistory(payload) {
    return this.createApprovalHistory(payload);
  },

  async findBusinessAdmins(businessId) {
    if (this._isNil(businessId)) {
      return { success: false, error: 'businessId is required' };
    }

    try {
      const query = `
        SELECT user_id, full_name, email
        FROM users
        WHERE business_id = $1
          AND role = 'admin'
          AND is_active = true
      `;
      const { rows } = await pool.query(query, [businessId]);
      return { success: true, data: rows };
    } catch (error) {
      return { success: false, error: this._handleDbError('findBusinessAdmins', error) };
    }
  }
};

module.exports = ApprovalModel;
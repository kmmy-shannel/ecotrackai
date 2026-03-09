const pool = require('../config/database');

const LEVEL_NAMES = ['Newcomer', 'Eco Warrior', 'Eco Champion', 'Eco Leader'];
const DEFAULT_THRESHOLDS = [
  { level: 'Newcomer', minPoints: 0 },
  { level: 'Eco Warrior', minPoints: 100 },
  { level: 'Eco Champion', minPoints: 300 },
  { level: 'Eco Leader', minPoints: 700 }
];

const VIEW_ROLES = new Set(['super_admin', 'admin']);

const EcoTrustService = {
  _ok(data = null) {
    return { success: true, data };
  },

  _fail(error) {
    return { success: false, error };
  },

  _isNil(value) {
    return value === null || value === undefined;
  },

  _safeNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  },

  _pickColumn(columns, candidates = []) {
    for (const candidate of candidates) {
      if (columns.includes(candidate)) return candidate;
    }
    return null;
  },

  _normalizeLevelName(input) {
    const value = String(input || '').trim().toLowerCase();
    if (value === 'newcomer') return 'Newcomer';
    if (value === 'eco warrior') return 'Eco Warrior';
    if (value === 'eco champion') return 'Eco Champion';
    if (value === 'eco leader') return 'Eco Leader';
    return null;
  },

  _resolveContext(userOrBusinessId) {
    if (userOrBusinessId && typeof userOrBusinessId === 'object') {
      const userId = userOrBusinessId.userId || userOrBusinessId.user_id || null;
      const businessId = userOrBusinessId.businessId || userOrBusinessId.business_id || null;
      const role = userOrBusinessId.role || null;

      if (this._isNil(role)) {
        return this._fail('Invalid user context');
      }

      return this._ok({ userId, businessId, role });
    }

    if (!this._isNil(userOrBusinessId)) {
      return this._ok({
        userId: null,
        businessId: userOrBusinessId,
        role: 'admin',
        legacy: true
      });
    }

    return this._fail('User context is required');
  },

  async _getTableColumns(tableName) {
    if (this._isNil(tableName)) return this._fail('tableName is required');

    try {
      const query = `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = $1
      `;
      const { rows } = await pool.query(query, [tableName]);
      return this._ok(rows.map((row) => row.column_name));
    } catch (error) {
      console.error('[EcoTrustService._getTableColumns]', error);
      return this._fail('Failed to inspect table metadata');
    }
  },

  _validateThresholds(input) {
    if (!Array.isArray(input) || input.length === 0) {
      return this._fail('thresholds must be a non-empty array');
    }

    const mapped = [];
    for (const row of input) {
      const level = this._normalizeLevelName(row?.level || row?.name);
      const minPoints = this._safeNumber(row?.minPoints ?? row?.min_points, NaN);

      if (!level) return this._fail('Invalid level name in thresholds');
      if (!Number.isFinite(minPoints) || minPoints < 0) {
        return this._fail('minPoints must be a non-negative number');
      }

      mapped.push({
        level,
        minPoints: Math.floor(minPoints)
      });
    }

    const uniqueLevels = new Set(mapped.map((row) => row.level));
    if (uniqueLevels.size !== LEVEL_NAMES.length) {
      return this._fail('Thresholds must include all required levels');
    }

    const ordered = LEVEL_NAMES.map((name) => mapped.find((row) => row.level === name));
    for (let i = 1; i < ordered.length; i += 1) {
      if (ordered[i].minPoints < ordered[i - 1].minPoints) {
        return this._fail('Thresholds must be non-decreasing by level order');
      }
    }

    return this._ok(ordered);
  },

  _resolveLevel(score, thresholds) {
    let level = thresholds[0]?.level || 'Newcomer';
    for (const threshold of thresholds) {
      if (score >= threshold.minPoints) {
        level = threshold.level;
      }
    }
    return level;
  },

  async _getThresholdStorage() {
    const rowTables = ['ecotrust_level_thresholds', 'ecotrust_levels'];
    for (const tableName of rowTables) {
      const colResult = await this._getTableColumns(tableName);
      if (!colResult.success) return colResult;
      const cols = colResult.data || [];
      if (!cols.length) continue;

      const levelCol = this._pickColumn(cols, ['level_name', 'level', 'name']);
      const minCol = this._pickColumn(cols, ['min_points', 'min_score', 'threshold_score', 'threshold']);
      if (!levelCol || !minCol) continue;

      return this._ok({
        type: 'rows',
        tableName,
        columns: cols,
        levelCol,
        minCol
      });
    }

    const configTables = ['ecotrust_config', 'system_settings'];
    for (const tableName of configTables) {
      const colResult = await this._getTableColumns(tableName);
      if (!colResult.success) return colResult;
      const cols = colResult.data || [];
      if (!cols.length) continue;

      const keyCol = this._pickColumn(cols, ['config_key', 'setting_key', 'key_name', 'key']);
      const valueCol = this._pickColumn(cols, ['config_value', 'setting_value', 'value', 'value_json']);
      if (!keyCol || !valueCol) continue;

      return this._ok({
        type: 'json',
        tableName,
        columns: cols,
        keyCol,
        valueCol
      });
    }

    return this._ok(null);
  },

  async _loadThresholdsFromStorage(storage) {
    try {
      if (!storage) {
        return this._ok({
          thresholds: DEFAULT_THRESHOLDS,
          source: 'default'
        });
      }

      if (storage.type === 'rows') {
        const query = `
          SELECT ${storage.levelCol} AS level_name, ${storage.minCol} AS min_points
          FROM ${storage.tableName}
          ORDER BY ${storage.minCol} ASC
        `;
        const { rows } = await pool.query(query);
        const normalized = rows
          .map((row) => ({
            level: this._normalizeLevelName(row.level_name),
            minPoints: this._safeNumber(row.min_points, NaN)
          }))
          .filter((row) => row.level && Number.isFinite(row.minPoints));

        const validated = this._validateThresholds(normalized);
        if (!validated.success) {
          return this._ok({
            thresholds: DEFAULT_THRESHOLDS,
            source: 'default'
          });
        }

        return this._ok({
          thresholds: validated.data,
          source: storage.tableName
        });
      }

      const query = `
        SELECT ${storage.valueCol} AS config_value
        FROM ${storage.tableName}
        WHERE ${storage.keyCol} = $1
        LIMIT 1
      `;
      const { rows } = await pool.query(query, ['ecotrust_level_thresholds']);
      if (!rows.length) {
        return this._ok({
          thresholds: DEFAULT_THRESHOLDS,
          source: 'default'
        });
      }

      let parsed = rows[0].config_value;
      if (typeof parsed === 'string') {
        try {
          parsed = JSON.parse(parsed);
        } catch (_error) {
          parsed = null;
        }
      }

      const validated = this._validateThresholds(Array.isArray(parsed) ? parsed : []);
      if (!validated.success) {
        return this._ok({
          thresholds: DEFAULT_THRESHOLDS,
          source: 'default'
        });
      }

      return this._ok({
        thresholds: validated.data,
        source: storage.tableName
      });
    } catch (error) {
      console.error('[EcoTrustService._loadThresholdsFromStorage]', error);
      return this._fail('Failed to load EcoTrust thresholds');
    }
  },

  async _saveThresholdsToStorage(storage, thresholds) {
    if (!storage) {
      return this._fail('Threshold configuration storage table not found');
    }

    const validated = this._validateThresholds(thresholds);
    if (!validated.success) return validated;
    const clean = validated.data;

    try {
      if (storage.type === 'rows') {
        for (const item of clean) {
          const updateQuery = `
            UPDATE ${storage.tableName}
            SET ${storage.minCol} = $1
            WHERE LOWER(${storage.levelCol}) = LOWER($2)
          `;
          const updateResult = await pool.query(updateQuery, [item.minPoints, item.level]);
          if (updateResult.rowCount === 0) {
            const insertColumns = [storage.levelCol, storage.minCol];
            const insertValues = [item.level, item.minPoints];

            if (storage.columns.includes('created_at')) {
              insertColumns.push('created_at');
              insertValues.push(new Date());
            }
            if (storage.columns.includes('updated_at')) {
              insertColumns.push('updated_at');
              insertValues.push(new Date());
            }

            const placeholders = insertColumns.map((_, idx) => `$${idx + 1}`).join(', ');
            const insertQuery = `
              INSERT INTO ${storage.tableName} (${insertColumns.join(', ')})
              VALUES (${placeholders})
            `;
            await pool.query(insertQuery, insertValues);
          }
        }

        return this._ok(true);
      }

      const checkQuery = `
        SELECT 1
        FROM ${storage.tableName}
        WHERE ${storage.keyCol} = $1
        LIMIT 1
      `;
      const checkResult = await pool.query(checkQuery, ['ecotrust_level_thresholds']);

      if (checkResult.rowCount > 0) {
        const query = `
          UPDATE ${storage.tableName}
          SET ${storage.valueCol} = $1
          WHERE ${storage.keyCol} = $2
        `;
        await pool.query(query, [JSON.stringify(clean), 'ecotrust_level_thresholds']);
      } else {
        const insertColumns = [storage.keyCol, storage.valueCol];
        const insertValues = ['ecotrust_level_thresholds', JSON.stringify(clean)];
        if (storage.columns.includes('created_at')) {
          insertColumns.push('created_at');
          insertValues.push(new Date());
        }
        if (storage.columns.includes('updated_at')) {
          insertColumns.push('updated_at');
          insertValues.push(new Date());
        }

        const placeholders = insertColumns.map((_, idx) => `$${idx + 1}`).join(', ');
        const query = `
          INSERT INTO ${storage.tableName} (${insertColumns.join(', ')})
          VALUES (${placeholders})
        `;
        await pool.query(query, insertValues);
      }

      return this._ok(true);
    } catch (error) {
      console.error('[EcoTrustService._saveThresholdsToStorage]', error);
      return this._fail('Failed to update EcoTrust thresholds');
    }
  },

  async _getEcoScoreFields() {
    const colResult = await this._getTableColumns('ecotrust_scores');
    if (!colResult.success) return colResult;
    const columns = colResult.data || [];
    if (!columns.length) return this._fail('ecotrust_scores table not found');

    const scoreCol = this._pickColumn(columns, ['current_score', 'total_points', 'score']);
    const levelCol = this._pickColumn(columns, ['level', 'current_level']);
    const rankCol = this._pickColumn(columns, ['rank', 'rank_position']);
    if (!scoreCol) return this._fail('ecotrust_scores score column not found');

    return this._ok({ columns, scoreCol, levelCol, rankCol });
  },

  async _sumVerifiedPointsForBusiness(businessId) {
    if (this._isNil(businessId)) return this._fail('businessId is required');

    const txColsResult = await this._getTableColumns('ecotrust_transactions');
    if (!txColsResult.success) return txColsResult;
    const txCols = txColsResult.data || [];
    if (!txCols.length) return this._fail('ecotrust_transactions table not found');
    if (!txCols.includes('business_id') || !txCols.includes('points_earned')) {
      return this._fail('ecotrust_transactions required columns not found');
    }

    let verifiedFilter = 'AND 1 = 0';
    if (txCols.includes('verification_status')) {
      verifiedFilter = "AND verification_status = 'verified'";
    } else if (txCols.includes('is_verified')) {
      verifiedFilter = 'AND is_verified = TRUE';
    }

    try {
      const query = `
        SELECT COALESCE(SUM(points_earned), 0) AS total_points
        FROM ecotrust_transactions
        WHERE business_id = $1
          ${verifiedFilter}
      `;
      const { rows } = await pool.query(query, [businessId]);
      return this._ok(this._safeNumber(rows[0]?.total_points, 0));
    } catch (error) {
      console.error('[EcoTrustService._sumVerifiedPointsForBusiness]', error);
      return this._fail('Failed to sum verified EcoTrust points');
    }
  },

  async _recalculateRanks(scoreCol, rankCol) {
    if (!rankCol) return this._ok(true);

    try {
      const query = `
        WITH ranked AS (
          SELECT
            business_id,
            DENSE_RANK() OVER (ORDER BY COALESCE(${scoreCol}, 0) DESC) AS rank_value
          FROM ecotrust_scores
        )
        UPDATE ecotrust_scores e
        SET ${rankCol} = r.rank_value
        FROM ranked r
        WHERE e.business_id = r.business_id
      `;
      await pool.query(query);
      return this._ok(true);
    } catch (error) {
      console.error('[EcoTrustService._recalculateRanks]', error);
      return this._fail('Failed to recalculate ranks');
    }
  },

  async recalculateBusinessScore(userOrContext, businessIdOverride = null) {
    try {
      const ctxResult = this._resolveContext(userOrContext);
      if (!ctxResult.success) return ctxResult;
      const ctx = ctxResult.data;

      const targetBusinessId = businessIdOverride || ctx.businessId;
      if (this._isNil(targetBusinessId)) return this._fail('businessId is required');

      if (
        !this._isNil(businessIdOverride)
        && ctx.role !== 'super_admin'
        && String(targetBusinessId) !== String(ctx.businessId)
      ) {
        return this._fail('Not found or unauthorized');
      }

      const fieldsResult = await this._getEcoScoreFields();
      if (!fieldsResult.success) return fieldsResult;
      const { columns, scoreCol, levelCol, rankCol } = fieldsResult.data;

      const storageResult = await this._getThresholdStorage();
      if (!storageResult.success) return storageResult;
      const thresholdsResult = await this._loadThresholdsFromStorage(storageResult.data);
      if (!thresholdsResult.success) return thresholdsResult;
      const thresholds = thresholdsResult.data.thresholds;

      const scoreResult = await this._sumVerifiedPointsForBusiness(targetBusinessId);
      if (!scoreResult.success) return scoreResult;
      const scoreValue = scoreResult.data;
      const resolvedLevel = this._resolveLevel(scoreValue, thresholds);

      const setParts = [`${scoreCol} = $1`];
      const params = [scoreValue];

      if (levelCol) {
        params.push(resolvedLevel);
        setParts.push(`${levelCol} = $${params.length}`);
      }
      if (columns.includes('updated_at')) {
        params.push(new Date());
        setParts.push(`updated_at = $${params.length}`);
      }

      params.push(targetBusinessId);
      const updateQuery = `
        UPDATE ecotrust_scores
        SET ${setParts.join(', ')}
        WHERE business_id = $${params.length}
        RETURNING business_id
      `;
      const updateResult = await pool.query(updateQuery, params);

      if (updateResult.rowCount === 0) {
        const insertColumns = ['business_id', scoreCol];
        const insertValues = [targetBusinessId, scoreValue];
        if (levelCol) {
          insertColumns.push(levelCol);
          insertValues.push(resolvedLevel);
        }
        const placeholders = insertColumns.map((_, idx) => `$${idx + 1}`).join(', ');
        const insertQuery = `
          INSERT INTO ecotrust_scores (${insertColumns.join(', ')})
          VALUES (${placeholders})
        `;
        await pool.query(insertQuery, insertValues);
      }

      const rankResult = await this._recalculateRanks(scoreCol, rankCol);
      if (!rankResult.success) return rankResult;

      const rankQuery = `
        SELECT
          e.business_id,
          COALESCE(e.${scoreCol}, 0) AS score,
          ${levelCol ? `e.${levelCol}` : `'Newcomer'`} AS level,
          ${rankCol ? `e.${rankCol}` : 'NULL'} AS rank
        FROM ecotrust_scores e
        WHERE e.business_id = $1
      `;
      const rankData = await pool.query(rankQuery, [targetBusinessId]);
      return this._ok(rankData.rows[0] || {
        business_id: targetBusinessId,
        score: scoreValue,
        level: resolvedLevel,
        rank: null
      });
    } catch (error) {
      console.error('[EcoTrustService.recalculateBusinessScore]', error);
      return this._fail('Failed to recalculate EcoTrust score');
    }
  },

  async _generateLeaderboard(limit = 50) {
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 500);
    const fieldsResult = await this._getEcoScoreFields();
    if (!fieldsResult.success) return fieldsResult;
    const { scoreCol, levelCol, rankCol } = fieldsResult.data;

    const rankExpression = rankCol
      ? `COALESCE(e.${rankCol}, DENSE_RANK() OVER (ORDER BY COALESCE(e.${scoreCol}, 0) DESC))`
      : `DENSE_RANK() OVER (ORDER BY COALESCE(e.${scoreCol}, 0) DESC)`;

    const query = `
      SELECT
        b.business_id,
        b.business_name,
        COALESCE(e.${scoreCol}, 0) AS score,
        ${levelCol ? `COALESCE(e.${levelCol}, 'Newcomer')` : `'Newcomer'`} AS level,
        ${rankExpression} AS rank
      FROM business_profiles b
      LEFT JOIN ecotrust_scores e ON e.business_id = b.business_id
      ORDER BY score DESC, b.business_name ASC
      LIMIT $1
    `;

    try {
      const { rows } = await pool.query(query, [safeLimit]);
      return this._ok(rows);
    } catch (error) {
      console.error('[EcoTrustService._generateLeaderboard]', error);
      return this._fail('Failed to generate EcoTrust leaderboard');
    }
  },

  async getLeaderboard(userOrContext, limit = 50) {
    try {
      const ctxResult = this._resolveContext(userOrContext);
      if (!ctxResult.success) return ctxResult;
      const ctx = ctxResult.data;

      if (!VIEW_ROLES.has(ctx.role)) {
        return this._fail('Not authorized to access EcoTrust leaderboard');
      }

      const leaderboardResult = await this._generateLeaderboard(limit);
      if (!leaderboardResult.success) return leaderboardResult;
      const leaderboard = leaderboardResult.data || [];

      if (ctx.role === 'super_admin') {
        return this._ok({
          scope: 'global',
          leaderboard
        });
      }

      const own = leaderboard.find((row) => String(row.business_id) === String(ctx.businessId)) || null;
      return this._ok({
        scope: 'own_business',
        ranking: own
      });
    } catch (error) {
      console.error('[EcoTrustService.getLeaderboard]', error);
      return this._fail('Failed to fetch EcoTrust leaderboard');
    }
  },

  async getThresholds(userOrContext) {
    try {
      const ctxResult = this._resolveContext(userOrContext);
      if (!ctxResult.success) return ctxResult;
      const ctx = ctxResult.data;

      if (!VIEW_ROLES.has(ctx.role)) {
        return this._fail('Not authorized to view EcoTrust thresholds');
      }

      const storageResult = await this._getThresholdStorage();
      if (!storageResult.success) return storageResult;
      const thresholdResult = await this._loadThresholdsFromStorage(storageResult.data);
      if (!thresholdResult.success) return thresholdResult;

      return this._ok({
        thresholds: thresholdResult.data.thresholds,
        source: thresholdResult.data.source,
        configurableBy: 'super_admin'
      });
    } catch (error) {
      console.error('[EcoTrustService.getThresholds]', error);
      return this._fail('Failed to get EcoTrust thresholds');
    }
  },

  async updateThresholds(userOrContext, payload = {}) {
    try {
      const ctxResult = this._resolveContext(userOrContext);
      if (!ctxResult.success) return ctxResult;
      const ctx = ctxResult.data;

      if (ctx.role !== 'super_admin') {
        return this._fail('Only super_admin can update EcoTrust thresholds');
      }

      const validated = this._validateThresholds(payload.thresholds);
      if (!validated.success) return validated;

      const storageResult = await this._getThresholdStorage();
      if (!storageResult.success) return storageResult;
      const saveResult = await this._saveThresholdsToStorage(storageResult.data, validated.data);
      if (!saveResult.success) return saveResult;

      const businessesResult = await pool.query('SELECT business_id FROM business_profiles');
      const recalculated = [];
      for (const row of businessesResult.rows || []) {
        const recalcResult = await this.recalculateBusinessScore(
          { userId: ctx.userId, businessId: row.business_id, role: 'super_admin' },
          row.business_id
        );
        if (!recalcResult.success) return recalcResult;
        recalculated.push(row.business_id);
      }

      return this._ok({
        thresholds: validated.data,
        recalculatedBusinesses: recalculated.length
      });
    } catch (error) {
      console.error('[EcoTrustService.updateThresholds]', error);
      return this._fail('Failed to update EcoTrust thresholds');
    }
  }
};

module.exports = EcoTrustService;

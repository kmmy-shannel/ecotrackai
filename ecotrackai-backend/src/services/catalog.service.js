const CatalogModel = require('../models/catalog.model');

const READ_ROLES  = new Set(['super_admin', 'admin']);
const WRITE_ROLES = new Set(['super_admin']);
const STORAGE_TYPES = new Set(['refrigerated', 'frozen', 'ambient', 'controlled_atmosphere']);

const CatalogService = {
  _ok(data = null)             { return { success: true,  data };               },
  _fail(error, statusCode=400) { return { success: false, error, statusCode };  },
  _isNil(value)                { return value === null || value === undefined;   },

  _extractContext(user) {
    if (!user || typeof user !== 'object') return this._fail('User context is required', 401);
    const userId     = user.userId     || user.user_id     || null;
    const role       = user.role;
    const businessId = user.businessId || user.business_id || null;
    if (this._isNil(role)) return this._fail('Invalid user context', 401);
    return this._ok({ userId, role, businessId });
  },

  _validatePayload(payload = {}, isUpdate = false) {
    if (!payload || typeof payload !== 'object') return this._fail('Request body is required');
    const requiredFields = [
      'name', 'default_storage_type', 'temperature_range_min',
      'temperature_range_max', 'humidity_range', 'default_shelf_life_days'
    ];
    if (!isUpdate) {
      for (const field of requiredFields) {
        if (this._isNil(payload[field]) || String(payload[field]).trim() === '') {
          return this._fail(`${field} is required`);
        }
      }
    }
    if (!this._isNil(payload.default_storage_type)) {
      if (!STORAGE_TYPES.has(String(payload.default_storage_type).trim().toLowerCase())) {
        return this._fail('Invalid default_storage_type');
      }
    }
    if (!this._isNil(payload.temperature_range_min) && Number.isNaN(Number(payload.temperature_range_min))) {
      return this._fail('temperature_range_min must be numeric');
    }
    if (!this._isNil(payload.temperature_range_max) && Number.isNaN(Number(payload.temperature_range_max))) {
      return this._fail('temperature_range_max must be numeric');
    }
    if (!this._isNil(payload.temperature_range_min) && !this._isNil(payload.temperature_range_max)) {
      if (Number(payload.temperature_range_min) > Number(payload.temperature_range_max)) {
        return this._fail('temperature_range_min cannot be greater than temperature_range_max');
      }
    }
    if (!this._isNil(payload.default_shelf_life_days)) {
      const sl = Number(payload.default_shelf_life_days);
      if (!Number.isInteger(sl) || sl <= 0) return this._fail('default_shelf_life_days must be a positive integer');
    }
    return this._ok(true);
  },

  // ── Existing: basic list ──────────────────────────────────────────────────

  async getCatalog(user) {
    try {
      const ctxResult = this._extractContext(user);
      if (!ctxResult.success) return ctxResult;
      if (!READ_ROLES.has(ctxResult.data.role)) return this._fail('Not authorized to view global fruit catalog', 403);

      const result = await CatalogModel.listAll();
      if (!result.success) return this._fail(result.error, 500);
      return this._ok({ fruits: result.data || [] });
    } catch (error) {
      console.error('[CatalogService.getCatalog]', error);
      return this._fail('Failed to retrieve global fruit catalog', 500);
    }
  },

  // ── NEW: full details including ripeness_stages, compatibility ────────────

  async getCatalogWithDetails(user) {
    try {
      const ctxResult = this._extractContext(user);
      if (!ctxResult.success) return ctxResult;
      if (!READ_ROLES.has(ctxResult.data.role)) {
        return this._fail('Not authorized to view global fruit catalog', 403);
      }

      const result = await CatalogModel.listAllWithDetails();
      if (!result.success) return this._fail(result.error, 500);
      return this._ok({ fruits: result.data || [] });
    } catch (error) {
      console.error('[CatalogService.getCatalogWithDetails]', error);
      return this._fail('Failed to retrieve catalog with details', 500);
    }
  },

  // ── Existing methods (unchanged) ─────────────────────────────────────────

  async getCatalogFruitById(user, fruitId) {
    try {
      const ctxResult = this._extractContext(user);
      if (!ctxResult.success) return ctxResult;
      if (!READ_ROLES.has(ctxResult.data.role)) return this._fail('Not authorized to view global fruit catalog', 403);
      if (this._isNil(fruitId)) return this._fail('fruitId is required');

      const result = await CatalogModel.findById(fruitId);
      if (!result.success) {
        return result.error === 'Not found or unauthorized'
          ? this._fail('Fruit not found', 404)
          : this._fail(result.error, 500);
      }
      return this._ok({ fruit: result.data });
    } catch (error) {
      console.error('[CatalogService.getCatalogFruitById]', error);
      return this._fail('Failed to retrieve fruit catalog item', 500);
    }
  },

  async createCatalogFruit(user, payload) {
    try {
      const ctxResult = this._extractContext(user);
      if (!ctxResult.success) return ctxResult;
      const ctx = ctxResult.data;
      if (!WRITE_ROLES.has(ctx.role)) return this._fail('Only super_admin can create fruits in catalog', 403);

      const validation = this._validatePayload(payload, false);
      if (!validation.success) return validation;

      const duplicateCheck = await CatalogModel.findByName(payload.name);
      if (!duplicateCheck.success) return this._fail(duplicateCheck.error, 500);
      if (duplicateCheck.data)     return this._fail('Fruit already exists in catalog');

      const createResult = await CatalogModel.create({
        name:                    payload.name,
        default_storage_type:    String(payload.default_storage_type).trim().toLowerCase(),
        temperature_range_min:   Number(payload.temperature_range_min),
        temperature_range_max:   Number(payload.temperature_range_max),
        humidity_range:          String(payload.humidity_range).trim(),
        default_shelf_life_days: Number(payload.default_shelf_life_days),
        unit_of_measure:         payload.unit_of_measure        || 'kg',
        is_ethylene_producer:    payload.is_ethylene_producer   ?? false,
        compatible_with:         Array.isArray(payload.compatible_with) ? payload.compatible_with : [],
        avoid_with:              Array.isArray(payload.avoid_with)       ? payload.avoid_with       : [],
        ripeness_stages:         payload.ripeness_stages        || {},
      });
      if (!createResult.success) return this._fail(createResult.error, 500);

      await CatalogModel.logCatalogChange({
        userId:   ctx.userId,
        role:     ctx.role,
        action:   'catalog_create',
        entityId: createResult.data?.fruit_id || null,
        details:  `Created fruit catalog entry: ${createResult.data?.name || payload.name}`,
        after:    createResult.data || null
      });

      return this._ok({ fruit: createResult.data });
    } catch (error) {
      console.error('[CatalogService.createCatalogFruit]', error);
      return this._fail('Failed to create fruit catalog item', 500);
    }
  },

  async updateCatalogFruit(user, fruitId, payload) {
    try {
      const ctxResult = this._extractContext(user);
      if (!ctxResult.success) return ctxResult;
      const ctx = ctxResult.data;
      if (!WRITE_ROLES.has(ctx.role)) return this._fail('Only super_admin can update fruits in catalog', 403);
      if (this._isNil(fruitId))       return this._fail('fruitId is required');

      const validation = this._validatePayload(payload, true);
      if (!validation.success) return validation;

      const existing = await CatalogModel.findById(fruitId);
      if (!existing.success) {
        return existing.error === 'Not found or unauthorized'
          ? this._fail('Fruit not found', 404)
          : this._fail(existing.error, 500);
      }

      if (!this._isNil(payload.name) && String(payload.name).trim() !== '') {
        const dup = await CatalogModel.findByName(payload.name);
        if (!dup.success) return this._fail(dup.error, 500);
        if (dup.data && String(dup.data.fruit_id) !== String(fruitId)) {
          return this._fail('Fruit already exists in catalog');
        }
      }

      const updateResult = await CatalogModel.update(fruitId, {
        name:                    this._isNil(payload.name)                  ? null : payload.name,
        default_storage_type:    this._isNil(payload.default_storage_type)  ? null : String(payload.default_storage_type).trim().toLowerCase(),
        temperature_range_min:   this._isNil(payload.temperature_range_min) ? null : Number(payload.temperature_range_min),
        temperature_range_max:   this._isNil(payload.temperature_range_max) ? null : Number(payload.temperature_range_max),
        humidity_range:          this._isNil(payload.humidity_range)         ? null : payload.humidity_range,
        default_shelf_life_days: this._isNil(payload.default_shelf_life_days)? null : Number(payload.default_shelf_life_days),
        unit_of_measure:         this._isNil(payload.unit_of_measure)        ? null : payload.unit_of_measure,
        is_ethylene_producer:    this._isNil(payload.is_ethylene_producer)   ? null : payload.is_ethylene_producer,
        compatible_with:         this._isNil(payload.compatible_with)        ? null : payload.compatible_with,
        avoid_with:              this._isNil(payload.avoid_with)             ? null : payload.avoid_with,
        ripeness_stages:         this._isNil(payload.ripeness_stages)        ? null : payload.ripeness_stages,
      });
      if (!updateResult.success) {
        return updateResult.error === 'Not found or unauthorized'
          ? this._fail('Fruit not found', 404)
          : this._fail(updateResult.error, 500);
      }

      await CatalogModel.logCatalogChange({
        userId:   ctx.userId,
        role:     ctx.role,
        action:   'catalog_update',
        entityId: fruitId,
        details:  `Updated fruit catalog entry: ${updateResult.data?.name || fruitId}`,
        before:   existing.data  || null,
        after:    updateResult.data || null
      });

      return this._ok({ fruit: updateResult.data });
    } catch (error) {
      console.error('[CatalogService.updateCatalogFruit]', error);
      return this._fail('Failed to update fruit catalog item', 500);
    }
  },

  async deleteCatalogFruit(user, fruitId) {
    try {
      const ctxResult = this._extractContext(user);
      if (!ctxResult.success) return ctxResult;
      const ctx = ctxResult.data;
      if (!WRITE_ROLES.has(ctx.role)) return this._fail('Only super_admin can delete fruits from catalog', 403);
      if (this._isNil(fruitId))       return this._fail('fruitId is required');

      const existing = await CatalogModel.findById(fruitId);
      if (!existing.success) {
        return existing.error === 'Not found or unauthorized'
          ? this._fail('Fruit not found', 404)
          : this._fail(existing.error, 500);
      }

      const usage = await CatalogModel.isUsedInInventory(fruitId, existing.data?.name || null);
      if (!usage.success)  return this._fail(usage.error, 500);
      if (usage.data?.used) return this._fail('Cannot delete fruit because it is already used in inventory/products', 409);

      const deleteResult = await CatalogModel.delete(fruitId);
      if (!deleteResult.success) {
        return deleteResult.error === 'Not found or unauthorized'
          ? this._fail('Fruit not found', 404)
          : this._fail(deleteResult.error, 500);
      }

      await CatalogModel.logCatalogChange({
        userId:   ctx.userId,
        role:     ctx.role,
        action:   'catalog_delete',
        entityId: fruitId,
        details:  `Deleted fruit catalog entry: ${existing.data?.name || fruitId}`,
        before:   existing.data || null
      });

      return this._ok({ deleted: true, fruitId: deleteResult.data?.fruit_id || fruitId });
    } catch (error) {
      console.error('[CatalogService.deleteCatalogFruit]', error);
      return this._fail('Failed to delete fruit catalog item', 500);
    }
  }
};

module.exports = CatalogService;
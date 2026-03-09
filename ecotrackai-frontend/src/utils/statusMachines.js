// ============================================================
// FILE: src/utils/statusMachines.js
//
// CHANGES vs previous version:
//   1. ROUTE_TRANSITIONS: added 'declined' so a declined route
//      can be re-planned (→ planned) or re-optimized (→ optimized)
//      by the admin, and the Sparkles button re-enables for it.
//   2. getTimelineChips 'route': added explicit guard for
//      'declined' so it renders a proper chip list instead of
//      all chips showing 'upcoming' (currentIndex was -1).
//   3. Everything else is identical to your original file.
// ============================================================

const normalizeRouteStatus = (status) => {
  if (!status) return '';
  const value = String(status).toLowerCase();
  if (value === 'assigned_to_driver') return 'approved';
  if (value === 'in_transit')         return 'in_progress';
  if (value === 'delivered')          return 'completed';
  return value;
};

export const SPOILAGE_TRANSITIONS = {
  active:         ['pending_review'],
  pending_review: ['approved', 'rejected'],
  approved:       ['resolved'],
  rejected:       ['active'],
  resolved:       [],
};

export const ROUTE_TRANSITIONS = {
  planned:           ['optimized'],
  optimized:         ['awaiting_approval'],
  awaiting_approval: ['approved', 'optimized'],
  approved:          ['in_progress'],
  in_progress:       ['completed'],
  completed:         [],
  // ── ADDED: declined routes can be re-planned or re-optimized ──
  declined:          ['planned', 'optimized'],
};

export const CARBON_TRANSITIONS = {
  pending:            ['verified', 'revision_requested'],
  revision_requested: ['pending'],
  verified:           [],
};

export const canTransitionSpoilage = (fromStatus, toStatus) => {
  const from = String(fromStatus || '').toLowerCase();
  const to   = String(toStatus   || '').toLowerCase();
  return SPOILAGE_TRANSITIONS[from]?.includes(to) || false;
};

export const canTransitionRoute = (fromStatus, toStatus) => {
  const from = normalizeRouteStatus(fromStatus);
  const to   = normalizeRouteStatus(toStatus);
  return ROUTE_TRANSITIONS[from]?.includes(to) || false;
};

export const canTransitionCarbon = (fromStatus, toStatus) => {
  const from = String(fromStatus || '').toLowerCase();
  const to   = String(toStatus   || '').toLowerCase();
  return CARBON_TRANSITIONS[from]?.includes(to) || false;
};

export const getTimelineChips = (type, currentStatus) => {
  const normalized = String(currentStatus || '').toLowerCase();

  if (type === 'route') {
    // ── ADDED: declined is not in the normal pipeline ─────────
    // Without this guard, normalizeRouteStatus('declined') = 'declined',
    // indexOf returns -1, and every chip renders as 'upcoming'.
    if (normalized === 'declined') {
      return [
        { status: 'planned',           state: 'done'    },
        { status: 'optimized',         state: 'done'    },
        { status: 'awaiting approval', state: 'done'    },
        { status: 'declined',          state: 'current' },
      ];
    }
    // ──────────────────────────────────────────────────────────

    const order = ['planned', 'optimized', 'awaiting_approval', 'approved', 'in_progress', 'completed'];
    const normalizedCurrent = normalizeRouteStatus(normalized);
    const currentIndex = order.indexOf(normalizedCurrent);
    return order.map((status, index) => ({
      status,
      state: index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'upcoming',
    }));
  }

  if (type === 'spoilage') {
    const order = ['active', 'pending_review', 'approved', 'resolved'];
    const currentIndex = order.indexOf(normalized);
    return order.map((status, index) => ({
      status,
      state: index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'upcoming',
    }));
  }

  if (type === 'carbon') {
    const order = ['pending', 'verified'];
    if (normalized === 'revision_requested') {
      return [
        { status: 'pending',             state: 'done'     },
        { status: 'revision_requested',  state: 'current'  },
        { status: 'verified',            state: 'upcoming' },
      ];
    }
    const currentIndex = order.indexOf(normalized);
    return order.map((status, index) => ({
      status,
      state: index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'upcoming',
    }));
  }

  return [];
};
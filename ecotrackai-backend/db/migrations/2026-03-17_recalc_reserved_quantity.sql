-- Recalculate reserved_quantity from active delivery_items to clear stale holds.
-- Active statuses mirror cancellation/approval flows.

WITH active AS (
  SELECT
    di.inventory_id,
    SUM(di.quantity_to_deliver) AS qty
  FROM delivery_items di
  JOIN delivery_routes dr ON dr.route_id = di.route_id
  WHERE dr.status IN ('planned','awaiting_approval','approved','in_transit')
  GROUP BY di.inventory_id
)
UPDATE inventory i
SET reserved_quantity = COALESCE(a.qty, 0)
FROM active a
WHERE i.inventory_id = a.inventory_id;

-- Ensure inventories with no active reservations are reset to 0
UPDATE inventory i
SET reserved_quantity = 0
WHERE NOT EXISTS (
  SELECT 1
  FROM delivery_items di
  JOIN delivery_routes dr ON dr.route_id = di.route_id
  WHERE di.inventory_id = i.inventory_id
    AND dr.status IN ('planned','awaiting_approval','approved','in_transit')
);

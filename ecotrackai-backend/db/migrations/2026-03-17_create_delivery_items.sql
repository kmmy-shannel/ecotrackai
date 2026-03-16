-- Migration: create delivery_items table for inventory reservations
-- Safe to run multiple times (IF NOT EXISTS) and idempotent indexes.

CREATE TABLE IF NOT EXISTS delivery_items (
  delivery_item_id     SERIAL PRIMARY KEY,
  route_id             INT NOT NULL,
  inventory_id         INT NOT NULL,
  quantity_to_deliver  NUMERIC(14,3) NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  -- Foreign keys (comment out if your DB lacks these tables)
  CONSTRAINT fk_delivery_items_route
    FOREIGN KEY (route_id) REFERENCES delivery_routes(route_id) ON DELETE CASCADE,
  CONSTRAINT fk_delivery_items_inventory
    FOREIGN KEY (inventory_id) REFERENCES inventory(inventory_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_delivery_items_route_id ON delivery_items(route_id);
CREATE INDEX IF NOT EXISTS idx_delivery_items_inventory_id ON delivery_items(inventory_id);

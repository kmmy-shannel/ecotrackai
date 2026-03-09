import { useEffect, useMemo, useState } from 'react';
import productService from '../services/product.service';
import deliveryService from '../services/delivery.service';

const RESERVED_ROUTE_STATUSES = new Set(['awaiting_approval', 'approved', 'in_progress']);

const useProducts = () => {
  const [products, setProducts] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await productService.getAllProducts();
      const productsList =
        response?.data?.products ||
        response?.data?.data?.products ||
        response?.products ||
        [];
      setProducts(productsList);
      setError('');
    } catch (_err) {
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const loadDeliveries = async () => {
    try {
      const response = await deliveryService.getAllDeliveries();
      const list = response?.data?.data?.deliveries || response?.data?.deliveries || response?.deliveries || [];
      setDeliveries(list);
    } catch (_err) {
      setDeliveries([]);
    }
  };

  const calculateReservedForProduct = (productId) => {
    const numericId = Number(productId);
    let reserved = 0;

    for (const delivery of deliveries) {
      if (!RESERVED_ROUTE_STATUSES.has(String(delivery.status || '').toLowerCase())) continue;

      let stops = [];
      if (Array.isArray(delivery.stops)) {
        stops = delivery.stops;
      } else if (typeof delivery.stops === 'string') {
        try {
          stops = JSON.parse(delivery.stops || '[]');
        } catch (_error) {
          stops = [];
        }
      }

      for (const stop of stops) {
        const productsAtStop = Array.isArray(stop?.products) ? stop.products : [];
        for (const assigned of productsAtStop) {
          const assignedProductId = Number(
            assigned.product_id ?? assigned.productId ?? assigned.id ?? null
          );
          const assignedQty = Number(
            assigned.quantity ?? assigned.assigned_quantity ?? assigned.qty ?? 0
          );
          if (assignedProductId === numericId) {
            reserved += Number.isFinite(assignedQty) ? assignedQty : 0;
          }
        }
      }
    }

    return reserved;
  };

  const calculateAvailableQuantity = (productId) => {
    const item = products.find((product) => Number(product.product_id) === Number(productId));
    if (!item) return 0;

    const total = Number(item.total_quantity || item.quantity || 0);
    const reserved = calculateReservedForProduct(productId);
    return Math.max(0, total - reserved);
  };

  const deleteProduct = async (productId) => {
    const confirmed = window.confirm('Delete this product?');
    if (!confirmed) return;

    try {
      await productService.deleteProduct(productId);
      setSuccess('Product deleted successfully');
      await loadProducts();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to delete product');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleProductCreated = async () => {
    await loadProducts();
    setSuccess('Product added successfully');
    setTimeout(() => setSuccess(''), 3000);
  };

  useEffect(() => {
    loadProducts();
    loadDeliveries();
  }, []);

  const filteredProducts = useMemo(
    () =>
      products.filter((product) =>
        String(product.product_name || '')
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      ),
    [products, searchTerm]
  );

  const getStorageBadgeColor = (category) => {
    const colors = {
      refrigerated: 'bg-blue-100 text-blue-700',
      frozen: 'bg-cyan-100 text-cyan-700',
      ambient: 'bg-gray-100 text-gray-700',
      controlled_atmosphere: 'bg-purple-100 text-purple-700',
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  return {
    products: filteredProducts,
    loading,
    error,
    success,
    searchTerm,
    setSearchTerm,
    deleteProduct,
    handleProductCreated,
    getStorageBadgeColor,
    calculateAvailableQuantity,
    refreshProducts: loadProducts,
  };
};

export default useProducts;

import { useState, useEffect } from 'react';
import productService from '../services/product.service';

const useProducts = () => {
  // ── State ──────────────────────────────────────────────────
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // ── Business Logic ─────────────────────────────────────────

  // Load all products from API
  const loadProducts = async () => {
    try {
      setLoading(true);
      console.log('📡 Calling product service...');
      const response = await productService.getAllProducts();
      
      const productsList = response.data?.products || response.products || [];
      setProducts(productsList);
      setError('');
    } catch (err) {
      console.error('Load products error:', err);
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  // Delete a product with confirmation
  const deleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      await productService.deleteProduct(productId);
      setSuccess('Product deleted successfully');
      loadProducts(); // Reload after delete
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete product');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Handle successful product creation
  const handleProductCreated = () => {
    loadProducts();
    setSuccess('Product added successfully');
    setTimeout(() => setSuccess(''), 3000);
  };

  // ── Computed Values ────────────────────────────────────────

  // Filter products by search term
  const filteredProducts = products.filter(product =>
    product.product_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Storage badge color mapping
  const getStorageBadgeColor = (category) => {
    const colors = {
      refrigerated: 'bg-blue-100 text-blue-700',
      frozen: 'bg-cyan-100 text-cyan-700',
      ambient: 'bg-gray-100 text-gray-700',
      controlled_atmosphere: 'bg-purple-100 text-purple-700'
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  // ── Effects ────────────────────────────────────────────────

  // Auto-load products on mount
  useEffect(() => {
    loadProducts();
  }, []);

  // ── Public API ─────────────────────────────────────────────
  return {
    // State
    products: filteredProducts,
    loading,
    error,
    success,
    searchTerm,

    // Actions
    setSearchTerm,
    deleteProduct,
    handleProductCreated,

    // Helpers
    getStorageBadgeColor
  };
};

export default useProducts;
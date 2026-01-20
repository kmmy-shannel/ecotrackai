import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Trash2, Edit2, Package } from 'lucide-react';
import Layout from '../components/Layout';
import authService from '../services/auth.service';
import productService from '../services/product.service';
import AddProductModal from '../components/AddProductModal';

const ProductsPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      navigate('/');
      return;
    }
    setUser(currentUser);
    loadProducts();
  }, [navigate]);

 const loadProducts = async () => {
  try {
    setLoading(true);
    console.log('📡 Calling product service...');
    const response = await productService.getAllProducts();
    
    console.log('📦 Full response received:', response);
    console.log('📦 Response.data:', response.data);
    
    // Handle different response structures
    const productsList = response.data?.products || response.products || [];
    console.log('📦 Products list:', productsList);
    
    setProducts(productsList);
    setError('');
  } catch (err) {
    console.error('Load products error:', err);
    console.error('Error response:', err.response);
    console.error('Error data:', err.response?.data);
    setError('Failed to load products');
  } finally {
    setLoading(false);
  }
};

  const handleDelete = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      await productService.deleteProduct(productId);
      setSuccess('Product deleted successfully');
      loadProducts();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete product');
      setTimeout(() => setError(''), 3000);
    }
  };

  const filteredProducts = products.filter(product =>
    product.product_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStorageBadgeColor = (category) => {
    const colors = {
      refrigerated: 'bg-blue-100 text-blue-700',
      frozen: 'bg-cyan-100 text-cyan-700',
      ambient: 'bg-gray-100 text-gray-700',
      controlled_atmosphere: 'bg-purple-100 text-purple-700'
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  if (!user) return null;

  return (
    <Layout currentPage="Product Management" user={user}>
      {/* Success/Error Messages */}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg">
          {error}
        </div>
      )}

      {/* Top Bar */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search product..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <button className="px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            Sort
          </button>
        </div>
        
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg"
        >
          <Plus size={20} />
          <span className="font-medium">Add new product</span>
        </button>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Product</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Quantity</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Days</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Status</th>
              <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className="text-center py-12 text-gray-500">
                  Loading products...
                </td>
              </tr>
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center py-12">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <Package size={32} className="text-gray-400" />
                    </div>
                    <p className="text-gray-500 font-medium mb-1">No products found</p>
                    <p className="text-sm text-gray-400">Add your first product to get started</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredProducts.map((product) => (
                <tr key={product.product_id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
  <div className="flex items-center gap-3">
    {product.image_url ? (
      <img
        src={product.image_url}
        alt={product.product_name}
        className="w-12 h-12 object-cover rounded-lg border"
      />
    ) : (
      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
        <Package size={20} className="text-gray-400" />
      </div>
    )}

    <div>
      <p className="font-semibold text-gray-800">
        {product.product_name}
      </p>
      <p className="text-sm text-gray-500">
        {product.product_type}
      </p>
    </div>
  </div>
</td>

                  <td className="px-6 py-4">
                    <p className="text-gray-700">{parseFloat(product.total_quantity).toFixed(0)} {product.unit_of_measure}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-gray-700">{product.shelf_life_days} days</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStorageBadgeColor(product.storage_category)}`}>
                      {product.storage_category.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleDelete(product.product_id)}
                        className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                        title="Delete Product"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <AddProductModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadProducts();
            setSuccess('Product added successfully');
            setTimeout(() => setSuccess(''), 3000);
          }}
        />
      )}
    </Layout>
  );
};

export default ProductsPage;
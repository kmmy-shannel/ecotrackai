import React, { useState } from 'react';
import { X, Package, Upload } from 'lucide-react';
import productService from '../services/product.service';

const AddProductModal = ({ onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const [formData, setFormData] = useState({
    productName: '',
    productType: '',
    quantity: '',
    shelfLifeDays: '',
    storageCategory: '',
    optimalTempMin: '',
    optimalHumidityMin: '',
    unitPrice: '',
    totalValue: '',
    notes: '',
    unitOfMeasure: 'kg'
  });

  const productTypes = [
    'Vegetables',
    'Fruits',
    'Dairy',
    'Meat',
    'Frozen',
    'Dry Goods',
    'Beverages',
    'Other'
  ];

  const storageTypes = [
    { value: 'ambient', label: 'Room Temperature' },
    { value: 'refrigerated', label: 'Refrigerated' },
    { value: 'frozen', label: 'Frozen' },
    { value: 'controlled_atmosphere', label: 'Controlled Atmosphere' }
  ];

  const units = ['kg', 'liters', 'units', 'boxes', 'pallets'];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      
      // Auto-calculate total value
      if (name === 'quantity' || name === 'unitPrice') {
        const qty = parseFloat(name === 'quantity' ? value : updated.quantity) || 0;
        const price = parseFloat(name === 'unitPrice' ? value : updated.unitPrice) || 0;
        updated.totalValue = (qty * price).toFixed(2);
      }
      
      return updated;
    });
    setError('');
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB');
        return;
      }

      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file');
        return;
      }

      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      setError('');
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await productService.createProduct(formData, imageFile);
      onSuccess();
      
      setFormData({
        productName: '',
        productType: '',
        quantity: '',
        shelfLifeDays: '',
        storageCategory: '',
        optimalTempMin: '',
        optimalHumidityMin: '',
        unitPrice: '',
        totalValue: '',
        notes: '',
        unitOfMeasure: 'kg'
      });
      setImageFile(null);
      setImagePreview(null);
    } catch (err) {
      console.error('Create product error:', err);
      setError(err.response?.data?.message || 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-800">Product Details</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 grid grid-cols-12 gap-6">
            
            {/* Left Column - Product Details */}
            <div className="col-span-12 md:col-span-7 space-y-4">
              
              {/* Product Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Product Name:
                </label>
                <input
                  type="text"
                  name="productName"
                  value={formData.productName}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-green-500 focus:border-green-500"
                  placeholder="Enter product name"
                />
              </div>

              {/* Type and Quantity Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Type:
                  </label>
                  <select
                    name="productType"
                    value={formData.productType}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-green-500 focus:border-green-500 bg-white"
                  >
                    <option value="">Vegetables</option>
                    {productTypes.map(type => (
                      <option key={type} value={type.toLowerCase()}>
                        {type}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Options: Vegetable, Fruit, Grain, Dairy</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Quantity:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      name="quantity"
                      value={formData.quantity}
                      onChange={handleChange}
                      required
                      min="0"
                      step="0.01"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-green-500 focus:border-green-500"
                      placeholder="0"
                    />
                    <select
                      name="unitOfMeasure"
                      value={formData.unitOfMeasure}
                      onChange={handleChange}
                      className="w-20 px-2 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-green-500 bg-white"
                    >
                      {units.map(unit => (
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Shelf Life */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Shelf Life:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    name="shelfLifeDays"
                    value={formData.shelfLifeDays}
                    onChange={handleChange}
                    required
                    min="1"
                    className="w-24 px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-green-500 focus:border-green-500"
                    placeholder="0"
                  />
                  <span className="text-sm text-gray-600">days</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">How many days until it spoils</p>
              </div>
            </div>

            {/* Right Column - Photo */}
            <div className="col-span-12 md:col-span-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Photos <span className="text-gray-400 font-normal">Optional</span>
                </label>
                
                {imagePreview ? (
                  <div className="relative w-full h-64 bg-gray-100 rounded border border-gray-300 overflow-hidden group">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <label className="w-full h-64 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center cursor-pointer hover:border-green-400 hover:bg-green-50/30 transition-all">
                    <Upload className="text-gray-400 mb-2" size={28} />
                    <p className="text-sm text-gray-500 font-medium">Click to upload or</p>
                    <p className="text-sm text-gray-500">drag and drop file</p>
                    <p className="text-xs text-gray-400 mt-2">PNG, JPG (MAX 5MB)</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* Storage Conditions Section */}
          <div className="px-6 pb-4">
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/50">
              <h3 className="text-base font-semibold text-gray-800 mb-4">Storage Conditions</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Storage Type:
                  </label>
                  <select
                    name="storageCategory"
                    value={formData.storageCategory}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-green-500 focus:border-green-500 bg-white"
                  >
                    <option value="">Room Temperature</option>
                    {storageTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Options: Room Temp, Refrigerated, Frozen</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Estimated Temperature:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      name="optimalTempMin"
                      value={formData.optimalTempMin}
                      onChange={handleChange}
                      step="0.1"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-green-500 focus:border-green-500"
                      placeholder="0"
                    />
                    <span className="text-sm text-gray-600">°C</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Optimal storage condition</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Estimated Humidity:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      name="optimalHumidityMin"
                      value={formData.optimalHumidityMin}
                      onChange={handleChange}
                      min="0"
                      max="100"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-green-500 focus:border-green-500"
                      placeholder="0"
                    />
                    <span className="text-sm text-gray-600">%</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Humidity range 0-100</p>
                </div>
              </div>
            </div>
          </div>

          {/* Financial Details Section */}
          <div className="px-6 pb-4">
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/50">
              <h3 className="text-base font-semibold text-gray-800 mb-4">Financial Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Unit price:
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">₱</span>
                    <input
                      type="number"
                      name="unitPrice"
                      value={formData.unitPrice}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-green-500 focus:border-green-500"
                      placeholder="0.00"
                    />
                    <span className="text-sm text-gray-600">per {formData.unitOfMeasure}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Total Value:
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">₱</span>
                    <input
                      type="number"
                      name="totalValue"
                      value={formData.totalValue}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded bg-gray-100 text-gray-700"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Notes:
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-green-500 focus:border-green-500 resize-none"
                  placeholder="Any additional notes or description..."
                />
                <p className="text-xs text-gray-400 mt-1">Optional product description</p>
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-6 py-2.5 bg-gray-400 text-white font-medium rounded hover:bg-gray-500 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-2.5 bg-green-600 text-white font-medium rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Adding Product...' : 'Add new product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProductModal;
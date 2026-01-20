import React, { useState } from 'react';
import { X, Package, Upload, Image as ImageIcon } from 'lucide-react';
import productService from '../services/product.service'; // Make sure the path is correct


const AddProductModal = ({ onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const [formData, setFormData] = useState({
    productName: '',
    productType: '',
    storageCategory: '',
    shelfLifeDays: '',
    optimalTempMin: '',
    optimalTempMax: '',
    optimalHumidityMin: '',
    optimalHumidityMax: '',
    unitOfMeasure: 'kg'
  });

  const productTypes = [
    'Dairy',
    'Meat',
    'Produce',
    'Frozen',
    'Dry Goods',
    'Beverages',
    'Other'
  ];

  const storageCategories = [
    { value: 'refrigerated', label: 'Refrigerated (0–8°C)' },
    { value: 'frozen', label: 'Frozen (-18°C or below)' },
    { value: 'ambient', label: 'Ambient (Room Temperature)' },
    { value: 'controlled_atmosphere', label: 'Controlled Atmosphere' }
  ];

  const units = ['kg', 'liters', 'units', 'boxes', 'pallets'];

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file');
        return;
      }

      setImageFile(file);
      
      // Create preview
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
    // Call the backend service with form data and image
    await productService.createProduct(formData, imageFile);

    // Only call onSuccess after successful creation
    onSuccess();

    // Reset form (optional)
    setFormData({
      productName: '',
      productType: '',
      storageCategory: '',
      shelfLifeDays: '',
      optimalTempMin: '',
      optimalTempMax: '',
      optimalHumidityMin: '',
      optimalHumidityMax: '',
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
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Package className="text-green-600" size={20} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Add New Product</h2>
              <p className="text-sm text-gray-500">Fill in the product details</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-6 space-y-6"
        >
          {/* Image Upload */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Product Image
            </h3>
            
            {imagePreview ? (
              <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <label className="w-full h-48 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-green-500 hover:bg-green-50 transition-all">
                <Upload className="text-gray-400 mb-2" size={32} />
                <p className="text-sm font-medium text-gray-600">Click to upload image</p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP up to 5MB</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Basic Information
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Name *
                </label>
                <input
                  type="text"
                  name="productName"
                  value={formData.productName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Type *
                </label>
                <select
                  name="productType"
                  value={formData.productType}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select type</option>
                  {productTypes.map(type => (
                    <option
                      key={type}
                      value={type.toLowerCase().replace(' ', '_')}
                    >
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unit of Measure *
                </label>
                <select
                  name="unitOfMeasure"
                  value={formData.unitOfMeasure}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  {units.map(unit => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Storage Requirements */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Storage Requirements
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Storage Category *
                </label>
                <select
                  name="storageCategory"
                  value={formData.storageCategory}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select storage category</option>
                  {storageCategories.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Shelf Life (Days) *
                </label>
                <input
                  type="number"
                  name="shelfLifeDays"
                  value={formData.shelfLifeDays}
                  onChange={handleChange}
                  min="1"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Temperature Range (°C)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    name="optimalTempMin"
                    value={formData.optimalTempMin}
                    onChange={handleChange}
                    placeholder="Min"
                    step="0.1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="number"
                    name="optimalTempMax"
                    value={formData.optimalTempMax}
                    onChange={handleChange}
                    placeholder="Max"
                    step="0.1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Humidity Range (%)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    name="optimalHumidityMin"
                    value={formData.optimalHumidityMin}
                    onChange={handleChange}
                    placeholder="Min %"
                    min="0"
                    max="100"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="number"
                    name="optimalHumidityMax"
                    value={formData.optimalHumidityMax}
                    onChange={handleChange}
                    placeholder="Max %"
                    min="0"
                    max="100"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Adding Product...' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProductModal;
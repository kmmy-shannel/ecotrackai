import api from './api';

class ProductService {
  async getAllProducts(search = '', sortBy = 'created_at', sortOrder = 'desc') {
    try {
      console.log('Calling GET /products');
      const response = await api.get('/products', {
        params: { search, sortBy, sortOrder }
      });
      console.log('Get products response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Get products error:', error);
      throw error;
    }
  }

  async getProductById(productId) {
    try {
      console.log('Calling GET /products/' + productId);
      const response = await api.get(`/products/${productId}`);
      console.log('Get product response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Get product error:', error);
      throw error;
    }
  }

 async createProduct(productData, imageFile) {
  try {
    const data = new FormData();

    // Append text fields
    data.append('productName', productData.productName);
    data.append('productType', productData.productType);
    data.append('storageCategory', productData.storageCategory);
    data.append('shelfLifeDays', productData.shelfLifeDays);
    data.append('optimalTempMin', productData.optimalTempMin || '');
    data.append('optimalTempMax', productData.optimalTempMax || '');
    data.append('optimalHumidityMin', productData.optimalHumidityMin || '');
    data.append('optimalHumidityMax', productData.optimalHumidityMax || '');
    data.append('unitOfMeasure', productData.unitOfMeasure);

    // Append image if exists
    if (imageFile) {
      data.append('productImage', imageFile);
    }

    const response = await api.post('/products', data, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return response.data; // Only return the response data
  } catch (error) {
    console.error('Create product error:', error.response?.data || error);
    throw error;
  }
}



  async updateProduct(productId, updateData) {
    try {
      console.log('Calling PUT /products/' + productId);
      const response = await api.put(`/products/${productId}`, updateData);
      console.log('Update product response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Update product error:', error);
      throw error;
    }
  }

  async deleteProduct(productId) {
    try {
      console.log('Calling DELETE /products/' + productId);
      const response = await api.delete(`/products/${productId}`);
      console.log('Delete product response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Delete product error:', error);
      throw error;
    }
  }
}

export default new ProductService();
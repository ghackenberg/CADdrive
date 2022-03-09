import axios from 'axios'
// Commons
import { Product, ProductData, ProductREST } from 'productboard-common'
// Globals
import { auth } from '../auth'

class ProductClientImpl implements ProductREST {
    async findProducts(): Promise<Product[]> {
        return (await axios.get<Product[]>(`/rest/products`, { auth })).data
    }
    async addProduct(data: ProductData): Promise<Product> {
        return (await axios.post<Product>('/rest/products', data, { auth })).data
    }
    async getProduct(id: string): Promise<Product> {
        return (await axios.get<Product>(`/rest/products/${id}`, { auth })).data
    }
    async updateProduct(id: string, data: ProductData): Promise<Product> {
        return (await axios.put<Product>(`/rest/products/${id}`, data, { auth })).data
    }
    async deleteProduct(id: string): Promise<Product> {
        return (await axios.delete<Product>(`/rest/products/${id}`, { auth })).data
    }
}

export const ProductClient = new ProductClientImpl()
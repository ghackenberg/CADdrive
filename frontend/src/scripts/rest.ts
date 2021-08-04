import axios from 'axios'
import { Audit, AuditREST, Product, ProductREST, User, UserREST } from 'fhooe-audit-platform-common'

class UserClient implements UserREST {
    async findAll() {
        return (await axios.get<User[]>('/rest/users')).data
    }

    async addUser(id: User) {
        return (await axios.post<User>('/rest/users', id)).data
    }

    async updateUser(user: User) {
        return (await axios.put<User>('/rest/users', user)).data
    }
}

class ProductClient implements ProductREST {
    async findAll() {
        return (await axios.get<Product[]>('/rest/products')).data
    }
}

class AuditClient implements AuditREST {
    async findAll() {
        return (await axios.get<Audit[]>('/rest/audits')).data
    }
}

export const UserAPI = new UserClient()
export const ProductAPI = new ProductClient()
export const AuditAPI = new AuditClient()
import { User, UserAddData, UserUpdateData, UserREST } from 'productboard-common'

import { UserClient } from '../clients/rest/user'

class UserManagerImpl implements UserREST<UserAddData, File> {
    private userIndex: {[id: string]: User} = {}
    private findResult: {[id: string]: boolean}

    async checkUser(): Promise<User> {
        // Call backend
        const user = await UserClient.checkUser()
        // Update user index
        this.userIndex[user.id] = user
        // Return user
        return user
    }

    findUsersFromCache() { 
        if (this.findResult) { 
            return Object.keys(this.findResult).map(id => this.userIndex[id])
        } else { 
            return undefined 
        } 
    }

    async findUsers(query?: string, product?: string): Promise<User[]> {
        if (query || product) {
            return await UserClient.findUsers(query, product)
        }
        if (!this.findResult) {
            // Call backend
            const users = await UserClient.findUsers(query, product)
            // Update user index
            for (const user of users) {
                this.userIndex[user.id] = user
            }
            // Update user set
            this.findResult = {}
            for (const user of users) {
                this.findResult[user.id] = true
            }
        }
        // Return users
        return Object.keys(this.findResult).map(id => this.userIndex[id])
    }

    async addUser(data: UserAddData, file?: File): Promise<User> {
        // Call backend
        const user = await UserClient.addUser(data, file)
        // Update user index
        this.userIndex[user.id] = user
        // Update user set
        if (this.findResult) {
            this.findResult[user.id] = true
        }
        // Return user
        return user
    }

    getUserFromCache(userId: string) { 
        if (userId in this.userIndex) { 
            return this.userIndex[userId]
        } else { 
            return undefined 
        } 
    }

    async getUser(id: string): Promise<User> {
        if (!(id in this.userIndex)) {
            // Call backend
            const user = await UserClient.getUser(id)
            // Update user index
            this.userIndex[id] = user
        }
        // Return user
        return this.userIndex[id]
    }

    async updateUser(id: string, data: UserUpdateData, file?: File): Promise<User> {
        // Call backend
        const user = await UserClient.updateUser(id, data, file)
        // Update user index
        this.userIndex[id] = user
        // Return user
        return user
    }

    async deleteUser(id: string): Promise<User> {
        // Call backend
        const user = await UserClient.deleteUser(id)
        // Update user index
        this.userIndex[id] = user
        // Update user set
        if (this.findResult) {
            delete this.findResult[id]
        }
        // Return user
        return user
    }
}

export const UserManager = new UserManagerImpl()
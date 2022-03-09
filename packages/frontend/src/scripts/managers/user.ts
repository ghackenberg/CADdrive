import { User, UserData, UserREST } from 'productboard-common'
import { UserClient } from '../clients/rest/user'

class UserManagerImpl implements UserREST<UserData, File> {
    private userIndex: {[id: string]: User} = {}
    private userSet: {[id: string]: boolean}

    async checkUser(): Promise<User> {
        // Call backend
        const user = await UserClient.checkUser()
        // Update user index
        this.userIndex[user.id] = user
        // Return user
        return user
    }

    async findUsers(): Promise<User[]> {
        if (!this.userSet) {
            // Call backend
            const users = await UserClient.findUsers()
            // Update user index
            for (const user of users) {
                this.userIndex[user.id] = user
            }
            // Update user set
            this.userSet = {}
            for (const user of users) {
                this.userSet[user.id] = true
            }
        }
        // Return users
        return Object.keys(this.userSet).map(id => this.userIndex[id])
    }

    async addUser(data: UserData, file?: File): Promise<User> {
        // Call backend
        const user = await UserClient.addUser(data, file)
        // Update user index
        this.userIndex[user.id] = user
        // Update user set
        if (this.userSet) {
            this.userSet[user.id] = true
        }
        // Return user
        return user
    }

    async getUser(id: string): Promise<User> {
        if (!(id in this.userIndex)) {
            // Call backend
            const user = await UserClient.getUser(id)
            // Update user index
            this.userIndex[id] = user
            // Update user set
            if (this.userSet) {
                this.userSet[id] = true
            }
        }
        // Return user
        return this.userIndex[id]
    }

    async updateUser(id: string, data: UserData, file?: File): Promise<User> {
        // Call backend
        const user = await UserClient.updateUser(id, data, file)
        // Update user index
        this.userIndex[id] = user
        // Update user set
        if (this.userSet) {
            this.userSet[id] = true
        }
        // Return user
        return user
    }

    async deleteUser(id: string): Promise<User> {
        // Call backend
        const user = await UserClient.deleteUser(id)
        // Update user index
        this.userIndex[id] = user
        // Update user set
        if (this.userSet) {
            delete this.userSet[id]
        }
        // Return user
        return user
    }
}

export const UserManager = new UserManagerImpl()
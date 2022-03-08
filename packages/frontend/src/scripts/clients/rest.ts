import axios from 'axios'
// Commons
import { Comment, CommentData, CommentREST, Issue, IssueData, IssueREST, Member, MemberData, MemberREST, Product, ProductData, ProductREST, User, UserData, UserREST, Version, VersionData, VersionREST } from 'productboard-common'
// Globals
import { auth } from './auth'

class UserClient implements UserREST<UserData, File> {
    async checkUser(): Promise<User> {
        return (await axios.get<User>('/rest/users/check', { auth })).data
    }
    async findUsers(): Promise<User[]> {
        return (await axios.get<User[]>(`/rest/users`, { auth } )).data
    }
    async addUser(data: UserData, file?: File): Promise<User> {
        const body = new FormData()
        body.append('data', JSON.stringify(data))
        body.append('file', file)
        return (await axios.post<User>('/rest/users', body, { auth })).data
    }
    async getUser(id: string): Promise<User> {
        return (await axios.get<User>(`/rest/users/${id}`, { auth })).data
    }
    async updateUser(id: string, data: UserData, file?: File): Promise<User> {
        const body = new FormData()
        body.append('data', JSON.stringify(data))
        body.append('file', file)
        return (await axios.put<User>(`/rest/users/${id}`, body, { auth })).data
    }
    async deleteUser(id: string): Promise<User> {
        return (await axios.delete<User>(`rest/users/${id}`, { auth })).data
    }
}

class ProductClient implements ProductREST {
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

class VersionClient implements VersionREST<VersionData, File> {
    async findVersions(product: string): Promise<Version[]> {
        return (await axios.get<Version[]>('/rest/versions', { params: { product }, auth } )).data
    }
    async addVersion(data: VersionData, file: File): Promise<Version> {
        const body = new FormData()
        body.append('data', JSON.stringify(data))
        body.append('file', file)
        return (await axios.post<Version>('/rest/versions', body, { auth })).data
    }
    async getVersion(id: string): Promise<Version> {
        return (await axios.get<Version>(`/rest/versions/${id}`, { auth })).data
    }
    async updateVersion(id: string, data: VersionData, file?: File): Promise<Version> {
        const body = new FormData()
        body.append('data', JSON.stringify(data))
        body.append('file', file)
        return (await axios.put<Version>(`/rest/versions/${id}`, body, { auth })).data
    }
    async deleteVersion(id: string): Promise<Version> {
        return (await axios.delete<Version>(`/rest/versions/${id}`, { auth })).data
    }
}

class IssueClient implements IssueREST {
    async findIssues(product: string): Promise<Issue[]> {
        return (await axios.get<Issue[]>(`/rest/issues`, { params: { product }, auth })).data
    }
    async addIssue(data: IssueData): Promise<Issue> {
        return (await axios.post<Issue>('/rest/issues', data, { auth })).data
    }
    async getIssue(id: string): Promise<Issue> {
        return (await axios.get<Issue>(`/rest/issues/${id}`, { auth })).data
    }
    async updateIssue(id: string, data: IssueData): Promise<Issue> {
        return (await axios.put<Issue>(`/rest/issues/${id}`, data, { auth })).data
    }
    async deleteIssue(id: string): Promise<Issue> {
        return (await axios.delete<Issue>(`/rest/issues/${id}`, { auth })).data
    }
}

class CommentClient implements CommentREST {
    async findComments(issue: string): Promise<Comment[]> {
        return (await axios.get<Comment[]>('/rest/comments', { params: { issue }, auth })).data
    }
    async addComment(data: CommentData): Promise<Comment> {
        return (await axios.post<Comment>('/rest/comments', data, { auth })).data
    }
    async getComment(id: string): Promise<Comment> {
        return (await axios.get<Comment>(`/rest/comments/${id}`, { auth })).data
    }
    async updateComment(id: string, data: CommentData): Promise<Comment> {
        return (await axios.put<Comment>(`/rest/comments/${id}`, data, { auth })).data
    }
    async deleteComment(id: string): Promise<Comment> {
        return (await axios.delete<Comment>(`/rest/comments/${id}`, { auth })).data
    }
}

class MemberClient implements MemberREST {
    async findMembers(product: string, user?: string): Promise<Member[]> {
        return (await axios.get<Member[]>('/rest/members', { params: { product, user }, auth })).data
    }
    async addMember(data: MemberData): Promise<Member> {
        return (await axios.post<Member>('/rest/members', data, { auth })).data
    }
    async getMember(id: string): Promise<Member> {
        return (await axios.get<Member>(`/rest/members/${id}`, { auth })).data
    }
    async updateMember(id: string, data: MemberData): Promise<Member> {
        return (await axios.put<Member>(`/rest/members/${id}`, data, { auth })).data
    }
    async deleteMember(id: string): Promise<Member> {
        return (await axios.delete<Member>(`/rest/members/${id}`, { auth })).data
    }

}

export const UserAPI = new UserClient()
export const ProductAPI = new ProductClient()
export const VersionAPI = new VersionClient()
export const IssueAPI = new IssueClient()
export const CommentAPI = new CommentClient()
export const MemberAPI = new MemberClient()
import { Comment, CommentAddData, CommentUpdateData, CommentREST } from 'productboard-common'
import { CommentClient } from '../clients/rest/comment'

class CommentManagerImpl implements CommentREST<CommentAddData, CommentUpdateData, Blob> {
    private commentIndex: {[id: string]: Comment} = {}
    private findIndex: {[id: string]: {[id: string]: boolean}} = {}

    findCommentsFromCache(issueId: string) { 
        if (issueId in this.findIndex) { 
            return Object.keys(this.findIndex[issueId]).map(id => this.commentIndex[id])
        } else { 
            return undefined 
        } 
    }
    
    async findComments(issueId: string): Promise<Comment[]> {
        if (!(issueId in this.findIndex)) {
            // Call backend
            const comments = await CommentClient.findComments(issueId)
            // Upate comment index
            for (const comment of comments) {
                this.commentIndex[comment.id] = comment
            }
            // Update issue index
            this.findIndex[issueId] = {}
            for (const comment of comments) {
                this.findIndex[issueId][comment.id] = true
            }
        }
        // Return comments
        return Object.keys(this.findIndex[issueId]).map(id => this.commentIndex[id])
    }

    async addComment(data: CommentAddData, files: { audio?: Blob }): Promise<Comment> {
        // Call backend
        const comment = await CommentClient.addComment(data, files)
        // Update comment index
        this.commentIndex[comment.id] = comment
        // Update issue index
        if (comment.issueId in this.findIndex) {
            this.findIndex[comment.issueId][comment.id] = true
        }
        // Return comment
        return comment
    }

    async getComment(id: string): Promise<Comment> {
        if (!(id in this.commentIndex)) {
            // Call backend
            const comment = await CommentClient.getComment(id)
            // Update comment index
            this.commentIndex[id] = comment
            // Update issue index
            if (comment.issueId in this.findIndex) {
                this.findIndex[comment.issueId][id] = true
            }
        }
        // Return comment
        return this.commentIndex[id]
    }

    async updateComment(id: string, data: CommentUpdateData, files?: { audio?: Blob }): Promise<Comment> {
        if (id in this.commentIndex) {
            const comment = this.commentIndex[id]
            // Update issue index
            if (comment.issueId in this.findIndex) {
                delete this.findIndex[comment.issueId][id]
            }
        }
        // Call backend
        const comment = await CommentClient.updateComment(id, data, files)
        // Update comment index
        this.commentIndex[id] = comment
        // Update issue index
        if (comment.issueId in this.findIndex) {
            this.findIndex[comment.issueId][id] = true
        }
        // Return comment
        return comment
    }

    async deleteComment(id: string): Promise<Comment> {
        // Call backend
        const comment = await CommentClient.deleteComment(id)
        // Update comment index
        this.commentIndex[id] = comment
        // Update issue index
        if (comment.issueId in this.findIndex) {
            delete this.findIndex[comment.issueId][id]
        }
        // Return comment
        return comment
    }
}

export const CommentManager = new CommentManagerImpl()
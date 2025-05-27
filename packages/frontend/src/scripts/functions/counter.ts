import { CommentRead, IssueRead } from 'productboard-common' 

import { Part } from './markdown'

export function countParts(issues: IssueRead[], comments: {[id: string]: CommentRead[]}, issueParts: { [id: string]: Part[] }, commentParts: { [id: string]: Part[] }) {
    const partsCountNew: {[id: string]: number} = {}
    for(const issue of issues || []) {
        if (issue.issueId in (issueParts || {}) && issueParts[issue.issueId]) {
            partsCountNew[issue.issueId] = issueParts[issue.issueId].length
            if (issue.issueId in (comments || {}) && comments[issue.issueId]) {
                for ( const comment of comments[issue.issueId] || []) {
                    if (comment.commentId in (commentParts || {}) && commentParts[comment.commentId]) {
                        partsCountNew[issue.issueId] += commentParts[comment.commentId].length
                    }
                }
            }  
        }
    }
    return partsCountNew
}
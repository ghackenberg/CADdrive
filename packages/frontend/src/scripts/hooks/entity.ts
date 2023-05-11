import * as React from 'react'

import { CommentManager } from '../managers/comment'
import { IssueManager } from '../managers/issue'
import { MemberManager } from '../managers/member'
import { MilestoneManager } from '../managers/milestone'
import { ProductManager } from '../managers/product'
import { TagManager } from '../managers/tag'
import { TagAssignmentManager } from '../managers/tagAssignment'
import { UserManager } from '../managers/user'
import { VersionManager } from '../managers/version'

function useEntity<T extends { id: string }>(id: string, cache: () => T, get: (callback: (value: T) => void) => (() => void)) {
    const initialValue = id && id != 'new' && cache()

    const [value, setValue] = React.useState(initialValue)

    React.useEffect(() => {
        if (id && id != 'new') {
            return get(value => setValue(value))
        } else {
            setValue(undefined)
            return undefined
        }
    }, [id])

    return value
}

export function useUser(userId: string) {
    return useEntity(
        userId,
        () => UserManager.getUserFromCache(userId),
        callback => UserManager.getUser(userId, callback)
    )
}

export function useProduct(productId: string) {
    return useEntity(
        productId,
        () => ProductManager.getProductFromCache(productId),
        callback => ProductManager.getProduct(productId, callback)
    )
}

export function useVersion(versionId: string) {
    return useEntity(
        versionId,
        () => VersionManager.getVersionFromCache(versionId),
        callback => VersionManager.getVersion(versionId, callback)
    )
}

export function useIssue(issueId: string) {
    return useEntity(
        issueId,
        () => IssueManager.getIssueFromCache(issueId),
        callback => IssueManager.getIssue(issueId, callback)
    )
}

export function useComment(commentId: string) {
    return useEntity(
        commentId,
        () => CommentManager.getCommentFromCache(commentId),
        callback => CommentManager.getComment(commentId, callback)
    )
}

export function useMilestone(milestoneId: string) {
    return useEntity(
        milestoneId,
        () => MilestoneManager.getMilestoneFromCache(milestoneId),
        callback => MilestoneManager.getMilestone(milestoneId, callback)
    )
}

export function useMember(memberId: string) {
    return useEntity(
        memberId,
        () => MemberManager.getMemberFromCache(memberId),
        callback => MemberManager.getMember(memberId, callback)
    )
}

export function useTag(tagId: string) {
    return useEntity(
        tagId,
        () => TagManager.getTagFromCache(tagId),
        callback => TagManager.getTag(tagId, callback)
    )
}

export function useTagAssignment(tagAssignmentId: string) {
    return useEntity(
        tagAssignmentId,
        () => TagAssignmentManager.getTagAssignmentFromCache(tagAssignmentId),
        callback => TagAssignmentManager.getTagAssignment(tagAssignmentId, callback)
    )
}
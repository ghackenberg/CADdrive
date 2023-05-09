import * as React from 'react'

import { useTagAssignments } from "../../hooks/route"
import { TagWidget } from '../widgets/Tag'

import LoadIcon from '/src/images/load.png'

export const AssignedTagsWidget = (props: { issueId: string }) => {

    // HOOKS

    const tagAssignments = useTagAssignments(props.issueId)

    // RETURN

    return (
        <>
            {tagAssignments ? tagAssignments.map((assignment) => <TagWidget tagId={assignment.tagId} />) : <img src={LoadIcon} className='icon medium pad animation spin' />}
        </>
    )
}

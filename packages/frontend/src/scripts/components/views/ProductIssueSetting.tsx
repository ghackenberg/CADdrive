import  * as React from 'react'
import { useState, useEffect, useContext, useRef, FormEvent } from 'react'
import { Redirect, useParams } from 'react-router'

import { Object3D } from 'three'

import { Member, Version, Tag } from 'productboard-common'

import { UserContext } from '../../contexts/User'
import { collectParts, Part } from '../../functions/markdown'
import { computePath } from '../../functions/path'
import { useIssue, useProduct} from '../../hooks/entity'
import { useAsyncHistory } from '../../hooks/history'
import { useMembers, useMilestones, useTags, useTagAssignments } from '../../hooks/list'
import { IssueManager } from '../../managers/issue'
import { TagAssignmentManager } from '../../managers/tagAssignment'
import { AudioRecorder } from '../../services/recorder'
import { SubmitInput } from '../inputs/SubmitInput'
import { TagInput } from '../inputs/TagInput'
import { TextInput } from '../inputs/TextInput'
import { LegalFooter } from '../snippets/LegalFooter'
import { ProductFooter, ProductFooterItem } from '../snippets/ProductFooter'
import { ProductUserNameWidget } from '../widgets/ProductUserName'
import { ProductUserPictureWidget } from '../widgets/ProductUserPicture'
import { ProductView3D } from '../widgets/ProductView3D'
import { Column, Table } from '../widgets/Table'

import LeftIcon from '/src/images/setting.png'
import RightIcon from '/src/images/part.png'

import { LoadingView } from './Loading'

export const ProductIssueSettingView = () => {

    const { goBack, replace } = useAsyncHistory()

    // REFERENCES

    const textReference = useRef<HTMLTextAreaElement>()

    // CONTEXTS

    const { contextUser } = useContext(UserContext)

    // PARAMS

    const { productId, issueId } = useParams<{ productId: string, issueId: string }>()

    // HOOKS

    const product = useProduct(productId)
    const members = useMembers(productId)
    const milestones = useMilestones(productId)
    const issue = useIssue(issueId)
    const tags = useTags(productId)
    const tagAssignments = useTagAssignments(issueId, undefined)

    // INITIAL STATES

    const initialLabel = issue ? issue.name : ''
    const initialText = issue ? issue.description : ''
    const initialMarked = collectParts(initialText)

    const initialMilestoneId = new URLSearchParams(location.search).get('milestone') || (issue && issue.milestoneId)
    const initialAssigneeIds = issue ? issue.assigneeIds : []
    
    // STATES

    // - Values
    const [label, setLabel] = useState<string>(initialLabel)
    const [text, setText] = useState<string>(initialText)
    const [audio, setAudio] = useState<Blob>()
    const [milestoneId, setMilestoneId] = useState<string>(initialMilestoneId)
    const [assigneeIds, setAssigneeIds] = useState<string[]>(initialAssigneeIds)
    const [assignedTags, setAssignedTags] = React.useState<Tag[]>()

    // - Interactions
    const [recorder, setRecorder] = useState<AudioRecorder>()
    const [audioUrl, setAudioUrl] = useState<string>('')
    const [selected, setSelected] = useState<Part[]>([])
    const [marked, setMarked] = useState<Part[]>(initialMarked)
    const [active, setActive] = useState<string>('left')

    // EFFECTS

    // - Entities
    useEffect(() => {
        if (tagAssignments && tags) {
            const result: Tag[] = []
            tagAssignments.map(assignment => {
                for (let index = 0; index < tags.length; index++) {
                    if (assignment.tagId === tags[index].id) {
                        result.push(tags[index])
                    }
                }
            })
            setAssignedTags(result)
        }
    }, [tagAssignments, tags])

    // - Values
    useEffect(() => { issue && setLabel(issue.name) }, [issue])
    useEffect(() => { issue && setText(issue.description) }, [issue])
    useEffect(() => { issue && setMilestoneId(issue.milestoneId)}, [issue])
    useEffect(() => { issue && setAssigneeIds(issue.assigneeIds) }, [issue])

    // - Computations
    useEffect(() => {
        setMarked(collectParts(text || ''))
    }, [text])
    
    // FUNCTIONS

    async function startRecordAudio(event: React.MouseEvent<HTMLButtonElement>) {
        // TODO handle unmount!
        event.preventDefault()
        const recorder = new AudioRecorder()
        await recorder.start()
        setRecorder(recorder)
    }

    async function stopRecordAudio(event: React.MouseEvent<HTMLButtonElement>) {
        // TODO handle unmount!
        event.preventDefault()
        const data = await recorder.stop()
        setAudio(data)
        setAudioUrl(URL.createObjectURL(data))
        setRecorder(null)
    }

    async function removeAudio(event: React.MouseEvent<HTMLButtonElement>) {
        event.preventDefault()
        setAudio(null)
        setAudioUrl('')
    }

    function overObject(version: Version, object: Object3D) {
        const path = computePath(object)
        setSelected([{ productId: version.productId, versionId: version.id, objectPath: path, objectName: object.name }])
    }
    
    function outObject() {
        setSelected([])
    }

    function selectObject(version: Version, object: Object3D) {
        const path = computePath(object)
        const markdown = `[${object.name || object.type}](/products/${product.id}/versions/${version.id}/objects/${path})`
        if (document.activeElement == textReference.current) {
            const before = text.substring(0, textReference.current.selectionStart)
            const after = text.substring(textReference.current.selectionEnd)
            setText(`${before}${markdown}${after}`)
            setTimeout(() => {
                textReference.current.setSelectionRange(before.length + markdown.length, before.length + markdown.length)
            }, 0)
        } else {
            setText(`${text}${markdown}`)
            setTimeout(() => {
                textReference.current.focus()
            }, 0)
        }
    }

    async function submitIssue(event: FormEvent){
        // TODO handle unmount!
        event.preventDefault()
        if (issueId == 'new') {
            if (label && text) {
                const issue = await IssueManager.addIssue({ 
                    productId, 
                    name: label, 
                    parentIssueId: 'demo1',
                    stateId: 'demo1',
                    issueTypeId: 'demo1',
                    priority: 'demo1',
                    storypoints: 4,
                    progress: 4,
                    description: text, 
                    assigneeIds, 
                    milestoneId: milestoneId ? milestoneId : null 
                    }, 
                    { audio }
                )
                await replace(`/products/${productId}/issues/${issue.id}/comments`)
            }
        } else {
            if (label && text) {
                // add 
                assignedTags && assignedTags.forEach(assignedTag => {
                    const tagAssignment = tagAssignments.find(tagAssignment => tagAssignment.tagId == assignedTag.id)
                    if (!tagAssignment) {
                        TagAssignmentManager.addTagAssignment({tagId: assignedTag.id, issueId: issueId})
                    }
                })
                // delete
                tagAssignments && tagAssignments.forEach(tagAssignment => {
                    const assignedTag = assignedTags.find(assignedTag => assignedTag.id == tagAssignment.tagId)
                    if (!assignedTag) {
                        TagAssignmentManager.deleteTagAssignment(tagAssignment.id)
                    }
                })
                await IssueManager.updateIssue(issue.id, { ...issue, name: label, description: text, assigneeIds, milestoneId: milestoneId ? milestoneId : null }, { audio })
                await goBack()    
            }
        }
    }

    async function selectAssignee(userId: string) {
        const newAssignees = [...assigneeIds]
        const index = newAssignees.indexOf(userId)
        if (index == -1) {
            newAssignees.push(userId)
        } else {
            newAssignees.splice(index, 1)
        }
        setAssigneeIds(newAssignees)
    }

    async function selectTag(tag: Tag) {
        const newAssignedTags = [...assignedTags]
        const index = newAssignedTags.indexOf(tag)
        if (index == -1) {
            newAssignedTags.push(tag)
        } else {
            newAssignedTags.splice(index, 1)
        }
        setAssignedTags(newAssignedTags)
    }

    // CONSTANTS

    const columns: Column<Member>[] = [
        { label: '👤', content: member => (
            <ProductUserPictureWidget userId={member.userId} productId={productId} class='icon medium round'/>
        ) },
        { label: 'Name', class: 'fill left nowrap', content: member => (
            <ProductUserNameWidget userId={member.userId} productId={productId}/>
        ) },
        { label: '🛠️', class: 'fill center nowrap', content: member => (
            <input type="checkbox" checked={assigneeIds.indexOf(member.userId) != -1} onChange={() => selectAssignee(member.userId)}/>
        ) },
    ]

    const items: ProductFooterItem[] = [
        { name: 'left', text: 'Form view', image: LeftIcon },
        { name: 'right', text: 'Model view', image: RightIcon }
    ]

    // RETURN

    return (
        ((issueId == 'new' || (issue && tagAssignments && assignedTags)) && product && members && tags ) ? (
            issue && issue.deleted ? (
                <Redirect to='/'/>
            ) : (
                <>
                    <main className={`view product-issue-setting sidebar ${active == 'left' ? 'hidden' : 'visible'}`}>
                        <div>
                            <div>
                                <h1>{issueId == 'new' ? 'New issue' : 'Issue settings'}</h1>
                                <form onSubmit={submitIssue} onReset={goBack}>
                                    <TextInput label='Label' placeholder='Type label' value={label} change={setLabel} required/>
                                    <div>
                                        <div>
                                            <label>Text</label>
                                        </div>
                                        <div>
                                            <textarea ref={textReference} className='button fill lightgray' placeholder='Type label' value={text} onChange={event => setText(event.currentTarget.value)} required/>
                                        </div>
                                    </div>
                                    {issueId != 'new' &&
                                    <TagInput label='Tags' tags= {tags} assignedTags = {assignedTags} onClick ={selectTag}/>
                                    }
                                    <div>
                                        <div>
                                            <label>Audio</label>
                                        </div>
                                        <div>
                                            {recorder ? (
                                                <input type='button' value='Stop recording' onClick={stopRecordAudio} className='button fill gray'/>
                                            ) : (
                                                audio ? (
                                                    <>
                                                        <audio src={audioUrl} controls/>
                                                        <input type='button' value='Remove recording' onClick={removeAudio} className='button fill gray'/>
                                                    </>
                                                ) : (
                                                    <input type='button' value='Start recording' onClick={startRecordAudio} className='button fill gray'/>
                                                )
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <div>
                                            <label>Milestone</label>
                                        </div>
                                        <div>
                                            <select value={milestoneId || ''} onChange={event => setMilestoneId(event.currentTarget.value)} className='button fill lightgray'>
                                                <option >none</option>
                                                {milestones && milestones.map((milestone) => (
                                                    <option key={milestone.id} value={milestone.id}>
                                                        {milestone.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <div>
                                            <label>Assignees</label>
                                        </div>
                                        <div>
                                            {members && (
                                                <Table columns={columns} items={members}/>
                                            )}
                                        </div>
                                    </div>
                                    {contextUser ? (
                                        members.filter(member => member.userId == contextUser.id).length == 1 ? (
                                            <SubmitInput value='Save'/>
                                        ) : (
                                            <SubmitInput value='Save (requires role)' disabled={true}/>
                                        )
                                    ) : (
                                        <SubmitInput value='Save (requires login)' disabled={true}/>
                                    )}
                                </form>
                            </div>
                            <LegalFooter/>
                        </div>
                        <div>
                            <ProductView3D productId={productId} selected={selected} marked={marked} mouse={true} over={overObject} out={outObject} click={selectObject}/>
                        </div>
                    </main>
                    <ProductFooter items={items} active={active} setActive={setActive}/>
                </>
            )
        ) : (
            <LoadingView/>
        )
    )
}
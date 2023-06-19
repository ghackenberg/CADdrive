import * as React from 'react'

import shortid from 'shortid'
import { Object3D } from 'three'

import { Attachment, Version } from 'productboard-common'

import { UserContext } from '../../contexts/User'
import { collectParts, createProcessor } from '../../functions/markdown'
import { computePath } from '../../functions/path'
import { useComment, useIssue } from '../../hooks/entity'
import { useAttachments, useMembers } from '../../hooks/list'
import { AttachmentManager } from '../../managers/attachment'
import { CommentManager } from '../../managers/comment'
import { IssueManager } from '../../managers/issue'
import { AudioRecorder } from '../../services/recorder'
import { TextInput } from '../inputs/TextInput'
import { FileInputButton } from './FileInputButton'
import { ProductUserNameWidget } from './ProductUserName'
import { ProductUserPictureWidget } from './ProductUserPicture'

import PartIcon from '/src/images/part.png'
import CloseIcon from '/src/images/close.png'
import ReopenIcon from '/src/images/reopen.png'
import DeleteIcon from '/src/images/delete.png'
import StartRecordingIcon from '/src/images/startRecording.png'
import StopRecordingIcon from '/src/images/stopRecording.png'
import AttachmentIcon from '/src/images/attachment.png'

import { Column, Table } from './Table'

interface Part {
    productId: string
    versionId: string
    objectPath: string
    objectName: string
}

export const CommentView = (props: { class: string, productId: string, issueId: string, commentId: string, selectedTimestamp?: number, selectedVersion?: Version, selectedObject?: Object3D, setMarked: (parts: Part[]) => void, mouseover: (event: React.MouseEvent<HTMLAnchorElement>, part: Part) => void, mouseout: (event: React.MouseEvent<HTMLAnchorElement>, part: Part) => void, click: (event: React.MouseEvent<HTMLAnchorElement>, part: Part) => void }) => {

    // REFERENCES

    const textReference = React.useRef<HTMLTextAreaElement>()

    // CONTEXTS

    const { contextUser } = React.useContext(UserContext)

    // CONSTANTS

    let comment = useComment(props.commentId)
    const issue = useIssue(props.issueId)
    const members = useMembers(props.productId)
    const initialAttachments = useAttachments(props.commentId)

    // INITIAL STATES

    const initialHtml = comment && createProcessor(props.mouseover, props.mouseout, props.click).processSync(comment.text).result
    const initialParts = comment && collectParts(comment.text)

    // STATES
    const [attachments, setAttachments] = React.useState<Attachment[]>()
    const [text, setText] = React.useState<string>('')
    const [html, setHtml] = React.useState(initialHtml)
    const [parts, setParts] = React.useState(initialParts)

    // INTERACTIONS
    const [editMode, setEditMode] = React.useState<boolean>(!comment)
    const [files] = React.useState<{ id: string, image: File, audio: Blob, pdf: File, video: File }[]>([])
    const [recorder, setRecorder] = React.useState<AudioRecorder>()

    // EFFECTS

    React.useEffect(() => {
        setAttachments(initialAttachments || [])
    }, [initialAttachments]);

    React.useEffect(() => {
        props.setMarked(collectParts(text || ''))
    }, [text])

    React.useEffect(() => {
        if (comment) {
            setHtml(createProcessor(props.mouseover, props.mouseout, props.click).processSync(comment.text).result)
            setParts(collectParts(comment.text))
        } else {
            setParts(undefined)
            setHtml(undefined)
        }
    }, [comment])

    React.useEffect(() => {
        if (props.selectedTimestamp && props.selectedObject && props.selectedVersion) {
            const path = computePath(props.selectedObject)
            const markdown = `[${props.selectedObject.name || props.selectedObject.type}](/products/${props.productId}/versions/${props.selectedVersion.id}/objects/${path})`
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
    }, [props.selectedTimestamp]);

    // CONSTANTS

    const columns: Column<Attachment>[] = [
        {
            label: 'Name', class: 'left nowrap', content: attachment => (
                editMode ? (
                    <div>
                        <TextInput value={attachment.name} change={(text) => handleTextChange(attachments.indexOf(attachment), 'name', text)} ></TextInput>
                    </div>
                ) :
                    (<div>
                        {attachment.name}
                    </div>)
            )
        },
        {
            label: 'Description', class: 'left fill', content: attachment => (
                editMode ? (
                    <div>
                        <TextInput value={attachment.description} change={(text) => handleTextChange(attachments.indexOf(attachment), 'description', text)} ></TextInput>
                    </div>
                ) :
                    (<div>
                        {attachment.description}
                    </div>)
            )
        },
        {
            label: 'Type', class: 'center nowrap', content: attachment => (
                <div>
                    <span className='badge'>{attachment.type}</span>
                </div>
            )
        },
        {
            label: '🛠️', class: 'center', content: attachment => (
                <a onClick={event => deleteAttachment(event, attachment)}>
                    <img src={DeleteIcon} className='icon medium pad' />
                </a>
            )
        }
    ]

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
        addAttachment(undefined, data)
        setRecorder(null)
    }

    function handleTextChange(index: number, property: string, text: string) {
        setAttachments(attachments => {
            return attachments.map((attachment, idx) => {
                if (idx === index) {
                    return { ...attachment, [property]: text }
                }
                return attachment;
            })
        })
    }

    async function submitComment(action?: 'none' | 'close' | 'reopen') {
        // TODO handle unmount!
        if (text) {
            if (comment) {
                comment = await CommentManager.updateComment(comment.id, { ...comment, text: text }, {})
                setEditMode(false)
            }
            else {
                comment = await CommentManager.addComment({ issueId: issue.id, text: text, action: action }, {})
                setAttachments([])
            }
            // delete attachments      
            (initialAttachments || []).forEach(initialAttachment => {
                const attachment = (attachments || []).find(attachment => attachment.id == initialAttachment.id)
                if (!attachment) {
                    AttachmentManager.deleteAttachment(initialAttachment.id)
                }
            })
            // add attachments
            attachments.length > 0 && (attachments || []).forEach(attachment => {
                const initialAttachment = (initialAttachments || []).find(initialAttachment => initialAttachment.id == attachment.id)
                if (!initialAttachment) {
                    const attachmentFile = files.find(file => file.id == attachment.id)
                    const image = attachmentFile.image
                    const audio = attachmentFile.audio
                    const pdf = attachmentFile.pdf
                    const video = attachmentFile.video
                    AttachmentManager.addAttachment({ commentId: comment.id, userId: contextUser.id, name: attachment.name, type: attachment.type, description: attachment.description }, { audio, image, pdf, video })
                }
                // update attachments
                else if (initialAttachment) {
                    AttachmentManager.updateAttachment(attachment.id, { name: attachment.name, description: attachment.description, type: attachment.type }, {})
                }
            })
            setText('')
        }
    }

    async function submitCommentAndClose() {
        // TODO handle unmount!
        if (text) {
            await submitComment('close')
            await IssueManager.updateIssue(issue.id, { ...issue })
        }
    }

    async function submitCommentAndReopen() {
        // TODO handle unmount!
        if (text) {
            await submitComment('reopen')
            await IssueManager.updateIssue(issue.id, { ...issue })
        }
    }

    function enterEditMode() {
        setText(comment.text)
        setEditMode(true)
    }
    function exitEditMode() {
        setText('')
        setAttachments(initialAttachments)
        setEditMode(false)
    }

    async function deleteAttachment(event: React.UIEvent, attachment: Attachment) {
        // TODO handle unmount!
        event.stopPropagation()
        if (confirm('Do you really want to delete this attachment?')) {
            setAttachments(attachments => attachments.filter(prev => prev.id != attachment.id))
        }
    }
    function addAttachment(file?: File, audio?: Blob) {
        const id = shortid()
        let newAttachment: Attachment
        if (file && !audio) {
            newAttachment = { id: id, created: Date.now(), updated: Date.now(), deleted: null, userId: contextUser.id, commentId: props.commentId, name: file.name.split('.')[0], description: 'description', type: file.type.split('/')[1] }
            if (file.type.includes('pdf')) {
                files.push({ id: id, image: undefined, audio: undefined, pdf: file, video: undefined })
            }
            if (file.type.includes('image')) {
                files.push({ id: id, image: file, audio: undefined, pdf: undefined, video: undefined })
            }
            if (file.type.includes('video')) {
                files.push({ id: id, image: undefined, audio: undefined, pdf: undefined, video: file })
            }
        }
        if (!file && audio) {
            newAttachment = { id: id, created: Date.now(), updated: Date.now(), deleted: null, userId: contextUser.id, commentId: props.commentId, name: 'recording', description: 'description', type: 'webm' }
            files.push({ id: id, image: undefined, audio: audio, pdf: undefined, video: undefined })
        }
        setAttachments((prev) => [...prev, newAttachment])
    }

    function openInNewTab(attachment: Attachment) {
        const url = `/rest/files/${attachment.id}.${attachment.type}`
        window.open(url, '_blank');
    }

    // RETURN

    return (
        <>
            {
                (
                    <div key={comment ? comment.id : 'new'} className={`widget comment_view ${props.class} ${comment && contextUser && comment.userId == contextUser.id ? 'self' : ''}`}>
                        <div className="head">
                            <div className="icon">
                                {editMode == false ? (
                                    <a href={`/users/${comment.userId}`}>
                                        <ProductUserPictureWidget userId={comment.userId} productId={props.productId} class='big' />
                                    </a>
                                ) : (
                                    <a href={`/users/${contextUser.id}`}>
                                        <ProductUserPictureWidget userId={contextUser.id} productId={props.productId} class='big' />
                                    </a>
                                )
                                }
                            </div>
                            <div className="text">
                                {comment ? (
                                    <p>
                                        <strong><ProductUserNameWidget userId={comment.userId} productId={props.productId} /></strong> commented on {new Date(comment.updated).toISOString().substring(0, 10)}
                                    </p>
                                ) : (
                                    <p>
                                        <strong>New comment</strong>
                                    </p>
                                )
                                }
                                {comment && editMode == false && contextUser.id == comment.userId &&
                                    <button className='editIcon' onClick={enterEditMode}>🛠️</button>
                                }

                            </div>
                        </div>
                        <div className="body">
                            <div className="free" />
                            <div className="text">
                                {
                                    editMode == false && (
                                        <>
                                            {html}
                                            {attachments && attachments.length > 0 && <Table columns={columns.slice(0, columns.length - 1)} items={attachments} onClick={(entry) => { openInNewTab(entry) }} />}
                                        </>
                                    )
                                }
                                {editMode == true &&
                                    <>
                                        <textarea ref={textReference} placeholder={'Type text'} value={text} onChange={event => setText(event.currentTarget.value)} />
                                        {attachments && attachments.length > 0 && <Table columns={columns} items={attachments} />}
                                        {contextUser ? (
                                            members && members.filter(member => member.userId == contextUser.id).length == 1 ? (
                                                <>
                                                    {comment && (
                                                        contextUser.id == comment.userId && (
                                                            <>
                                                                <button className='button fill blue' onClick={() => submitComment('none')}>Update</button>
                                                                <button className='button fill red' onClick={exitEditMode}>Cancel</button>
                                                            </>
                                                        )
                                                    )}
                                                    {!comment && (
                                                        <>
                                                            <button className='button fill blue' onClick={() => submitComment('none')}>Save</button>
                                                            {issue.state == 'open' ? (
                                                                <button className='button stroke blue' onClick={submitCommentAndClose}>
                                                                    Close
                                                                </button>
                                                            ) : (
                                                                <button className='button stroke blue' onClick={submitCommentAndReopen}>
                                                                    Reopen
                                                                </button>
                                                            )}
                                                        </>
                                                    )}
                                                    <FileInputButton class='button stroke gray' label='upload' change={(file) => { addAttachment(file, undefined) }} accept='.jpg,.jpeg,.png,.pdf,.mp4,.webm' required={false}></FileInputButton>
                                                    {recorder ? (
                                                        <button onClick={stopRecordAudio} className='button stroke gray'>
                                                            <img className='icon' src={StopRecordingIcon}></img>
                                                        </button>
                                                    ) : (
                                                        <button onClick={startRecordAudio} className='button stroke gray'>
                                                            <img className='icon' src={StartRecordingIcon}></img>
                                                        </button>

                                                    )}
                                                </>

                                            ) : (
                                                <>
                                                    <button className='button fill blue'>
                                                        <span>Save</span>
                                                        <span className='badge'>requires role</span>
                                                    </button>
                                                    {issue.state == 'open' ? (
                                                        <button className='button stroke blue'>
                                                            <span>Close</span>
                                                            <span className='badge'>requires role</span>
                                                        </button>
                                                    ) : (
                                                        <button className='button stroke blue'>
                                                            <span>Reopen</span>
                                                            <span className='badge'>requires role</span>
                                                        </button>
                                                    )}
                                                    <button className='button stroke gray block-when-responsive'>
                                                        <span><img className='icon' src={AttachmentIcon}></img></span>
                                                        <span className='badge'>requires role</span>
                                                    </button>
                                                    <button className='button stroke gray block-when-responsive'>
                                                        <span><img className='icon' src={StartRecordingIcon}></img></span>
                                                        <span className='badge'>requires role</span>
                                                    </button>
                                                </>
                                            )
                                        ) : (
                                            <>

                                                <button className='button fill blue'>
                                                    <span>Save</span>
                                                    <span className='badge'>requires login</span>
                                                </button>
                                                {issue.state == 'open' ? (
                                                    <button className='button stroke blue'>
                                                        <span>Close</span>
                                                        <span className='badge'>requires login</span>
                                                    </button>
                                                ) : (
                                                    <button className='button stroke blue'>
                                                        <span>Reopen</span>
                                                        <span className='badge'>requires login</span>
                                                    </button>
                                                )}
                                                <button className='button stroke gray block-when-responsive'>
                                                    <span><img className='icon' src={AttachmentIcon}></img></span>
                                                    <span className='badge'>requires role</span>
                                                </button>
                                                <button className='button stroke gray block-when-responsive'>
                                                    <span><img className='icon' src={StartRecordingIcon}></img></span>
                                                    <span className='badge'>requires login</span>
                                                </button>
                                            </>
                                        )}
                                    </>
                                }

                            </div>
                        </div>
                        {comment && parts && parts.map((part, index) => (
                            <div key={index} className="note part">
                                <div className="free" />
                                <div className="text">
                                    <a href={`/products/${part.productId}/versions/${part.versionId}/objects/${part.objectPath}`} onMouseOver={event => props.mouseover(event, part)} onMouseOut={event => props.mouseout(event, part)} onClick={event => props.click(event, part)}>
                                        <span>
                                            <img src={PartIcon} />
                                        </span>
                                        {part.objectName}
                                    </a>
                                    was mentioned
                                </div>
                            </div>
                        ))}
                        {comment && 'action' in comment && comment.action != 'none' && (
                            <div className={`note action ${comment.action}`}>
                                <div className="free" />
                                <div className="text">
                                    <a>
                                        <span>
                                            <img src={comment.action == 'close' ? CloseIcon : ReopenIcon} />
                                        </span>
                                    </a>
                                    {comment.action == 'close' ? 'closed' : 'reopened'}
                                </div>
                            </div>
                        )}
                    </div>
                )
            }
        </>
    )
}
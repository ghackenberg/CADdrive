import * as React from 'react'

import { Attachment } from 'productboard-common'

import { UserContext } from '../../contexts/User'
import { collectParts, createProcessor } from '../../functions/markdown'
import { useComment, useIssue } from '../../hooks/entity'
import { useAttachments, useMembers } from '../../hooks/list'
import { AttachmentManager } from '../../managers/attachment'
import { CommentManager } from '../../managers/comment'
import { IssueManager } from '../../managers/issue'
import { ProductUserNameWidget } from './ProductUserName'
import { ProductUserPictureWidget } from './ProductUserPicture'

import PartIcon from '/src/images/part.png'
import CloseIcon from '/src/images/close.png'
import ReopenIcon from '/src/images/reopen.png'
import DeleteIcon from '/src/images/delete.png'

import { Column, Table } from './Table'

interface Part {
    productId: string
    versionId: string
    objectPath: string
    objectName: string
}

export const CommentView3 = (props: { class: string, productId: string, issueId: string, commentId: string, mouseover: (event: React.MouseEvent<HTMLAnchorElement>, part: Part) => void, mouseout: (event: React.MouseEvent<HTMLAnchorElement>, part: Part) => void, click: (event: React.MouseEvent<HTMLAnchorElement>, part: Part) => void }) => {

    // REFERENCES

    const textReference = React.useRef<HTMLTextAreaElement>()

    // CONTEXTS

    const { contextUser } = React.useContext(UserContext)

    // CONSTANTS

    const comment = useComment(props.commentId)
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
    const [editMode, setEditMode] = React.useState<boolean>(!comment)

    // EFFECTS

    React.useEffect(() => {
        setAttachments(initialAttachments)
        console.log(attachments)
    }, [initialAttachments]);

    React.useEffect(() => {
        if (comment) {
            setHtml(createProcessor(props.mouseover, props.mouseout, props.click).processSync(comment.text).result)
            setParts(collectParts(comment.text))
        } else {
            setParts(undefined)
            setHtml(undefined)
        }
    }, [comment])

    // CONSTANTS

    const columns: Column<Attachment>[] = [
        {
            label: 'Name', class: 'left', content: attachment => (
                <div>
                    {attachment.name}
                </div>
            )
        },
        {
            label: 'Description', class: 'center', content: attachment => (
                <div>
                    {attachment.description}
                </div>
            )
        },
        {
            label: 'Type', class: 'center', content: attachment => (
                <div>
                    {attachment.type}
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

    async function submitComment() {
        // TODO handle unmount!
        if (text) {
            if (comment) {
                // delete attachments      
                initialAttachments.length > 0 && initialAttachments.forEach(initialAttachment => {
                    const attachment = attachments.find(attachment => attachment.id == initialAttachment.id)
                    if (!attachment) {
                        console.log('lösche ' + initialAttachment.name)
                        AttachmentManager.deleteAttachment(initialAttachment.id)
                    }
                })

                await CommentManager.updateComment(comment.id, { ...comment, text: text }, {})
                setEditMode(false)
            }
            else {
                await CommentManager.addComment({ issueId: issue.id, text: text, action: 'none' }, {})
            }
            setText('')
        }
    }

    async function submitCommentAndClose() {
        // TODO handle unmount!
        if (text) {
            await CommentManager.addComment({ issueId: issue.id, text: text, action: 'close' }, {})
            await IssueManager.updateIssue(issue.id, { ...issue })
            setText('')
        }
    }

    async function submitCommentAndReopen() {
        // TODO handle unmount!
        if (text) {
            await CommentManager.addComment({ issueId: issue.id, text: text, action: 'reopen' }, {})
            await IssueManager.updateIssue(issue.id, { ...issue })
            setText('')
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
            console.log(attachment)
            setAttachments(attachments => attachments.filter(prev => prev.id != attachment.id))
        }
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
                                            {attachments &&
                                                attachments.map(attachment => {
                                                    return attachment.type == 'webm'
                                                        ? <audio key={attachment.id} src={`/rest/files/${attachment.id}.${attachment.type}`} controls />
                                                        : attachment.type == 'png' || attachment.type == 'jpg' || attachment.type == 'jpeg'
                                                            ? <img className='icon xxlarge' key={attachment.id} src={`/rest/files/${attachment.id}.${attachment.type}`}></img>
                                                            : <> </>
                                                })
                                            }
                                            {attachments && attachments.length > 0 && <Table columns={columns.slice(0, columns.length - 1)} items={attachments} />}
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
                                                                <button className='button fill blue' onClick={submitComment}>Update</button>
                                                                <button className='button fill red' onClick={exitEditMode}>Cancel</button>
                                                            </>
                                                        )

                                                    )}
                                                    {!comment && (
                                                        <>
                                                            <button className='button fill blue' onClick={submitComment}>Save</button>
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
                                                    )
                                                    }
                                                </>

                                            ) : (
                                                <>
                                                    <button className='button fill gray block-when-responsive'>
                                                        <span>Start recording</span>
                                                        <span className='badge'>requires role</span>
                                                    </button>
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
                                                </>
                                            )
                                        ) : (
                                            <>
                                                <button className='button fill gray block-when-responsive'>
                                                    <span>Start recording</span>
                                                    <span className='badge'>requires login</span>
                                                </button>
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
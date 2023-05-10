import  * as React from 'react'
import { useState, useContext } from 'react'
import { Redirect, useParams } from 'react-router'
import { NavLink } from 'react-router-dom'

import { Member } from 'productboard-common'

import { UserContext } from '../../contexts/User'
import { useProduct } from '../../hooks/entity'
import { useAsyncHistory } from '../../hooks/history'
import { useMembers } from '../../hooks/list'
import { MemberManager } from '../../managers/member'
import { LegalFooter } from '../snippets/LegalFooter'
import { ProductFooter, ProductFooterItem } from '../snippets/ProductFooter'
import { ProductView3D } from '../widgets/ProductView3D'
import { Column, Table } from '../widgets/Table'
import { ProductUserNameWidget } from '../widgets/ProductUserName'
import { ProductUserPictureWidget } from '../widgets/ProductUserPicture'
import { LoadingView } from './Loading'

import DeleteIcon from '/src/images/delete.png'
import LeftIcon from '/src/images/list.png'
import RightIcon from '/src/images/part.png'

export const ProductMemberView = () => {

    const { push } = useAsyncHistory()

    // CONTEXTS

    const { contextUser } = useContext(UserContext)

    // PARAMS

    const { productId } = useParams<{ productId: string }>()

    // HOOKS

    const product = useProduct(productId)
    const members = useMembers(productId)
    
    // STATES

    const [active, setActive] = useState<string>('left')

    // FUNCTIONS

    async function deleteMember(event: React.UIEvent, member:Member) {
        // TODO handle unmount!
        event.stopPropagation()
        if (confirm('Do you really want to delete this member?')) {
            await MemberManager.deleteMember(member.id)
        }
    }

    // CONSTANTS

    const columns: Column<Member>[] = [
        { label: '👤', content: member => (
            <ProductUserPictureWidget userId={member.userId} productId={productId} class='icon medium round middle'/>
        ) },
        { label: 'Name', class: 'left nowrap', content: member => (
            <ProductUserNameWidget userId={member.userId} productId={productId}/>
        ) },
        { label: 'Role', class: 'fill left nowrap', content: member => (
            <span className='badge role'>{member.role}</span>
        ) },
        { label: '🛠️', class: 'center', content: member => (
            <a onClick={event => deleteMember(event, member)}>
                <img src={DeleteIcon} className='icon medium pad'/>
            </a>
        ) }
    ]

    const items: ProductFooterItem[] = [
        { name: 'left', text: 'List view', image: LeftIcon },
        { name: 'right', text: 'Model view', image: RightIcon }
    ]

    // RETURN

    return (
        (product && members) ? (
            product.deleted ? (
                <Redirect to='/'/>
            ) : (
                <>
                    <main className={`view product-member sidebar ${active == 'left' ? 'hidden' : 'visible'}` }>
                        <div>
                            <div>
                                {contextUser ? (
                                    members.filter(member => member.userId == contextUser.id && member.role == 'manager').length == 1 ? (
                                        <NavLink to={`/products/${productId}/members/new/settings`} className='button fill green'>
                                            New member
                                        </NavLink>
                                    ) : (
                                        <a className='button fill green' style={{fontStyle: 'italic'}}>
                                            New member (requires role)
                                        </a>
                                    )
                                ) : (
                                    <a className='button fill green' style={{fontStyle: 'italic'}}>
                                        New member (requires login)
                                    </a>
                                )}
                                <Table columns={columns} items={members} onClick={member => push(`/products/${productId}/members/${member.id}/settings`)}/>
                            </div>
                            <LegalFooter/>
                        </div>
                        <div>
                            <ProductView3D product={product} mouse={true}/>
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
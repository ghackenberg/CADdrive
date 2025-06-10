import  * as React from 'react'
import { useState, useEffect, Fragment, FormEvent, useContext } from 'react'
import { Redirect, useLocation, useParams } from 'react-router'

import { MemberRole, UserRead } from 'productboard-common'

import { CacheAPI } from '../../clients/cache'
import { MemberClient } from '../../clients/rest/member'
import { UserClient } from '../../clients/rest/user'
import { UserContext } from '../../contexts/User'
import { useMember, useProduct } from '../../hooks/entity'
import { useAsyncHistory } from '../../hooks/history'
import { useMembers } from '../../hooks/list'
import { ButtonInput } from '../inputs/ButtonInput'
import { TextInput } from '../inputs/TextInput'
import { LegalFooter } from '../snippets/LegalFooter'
import { ProductFooter, ProductFooterItem } from '../snippets/ProductFooter'
import { Column, Table } from '../widgets/Table'
import { ProductView3D } from '../widgets/ProductView3D'
import { UserPictureWidget } from '../widgets/UserPicture'
import { LoadingView } from './Loading'

import DeleteIcon from '/src/images/delete.png'
import LeftIcon from '/src/images/setting.png'
import RightIcon from '/src/images/part.png'

const ROLES: MemberRole[] = ['manager', 'engineer', 'customer']

export const ProductMemberSettingView = () => {

    // HISTORY
    
    const { goBack } = useAsyncHistory()

    // CONTEXTS

    const { contextUser } = useContext(UserContext)

    // LOCATION

    const { hash } = useLocation()

    // PARAMS

    const { productId, memberId } = useParams<{ productId: string, memberId: string }>()

    // ENTITIES

    const product = useProduct(productId)
    const members = useMembers(productId)
    const member = useMember(productId, memberId)
    
    // INITIAL STATES

    const initialUser = member ? CacheAPI.getUser(member.userId) : undefined
    const initialRole = member ? member.role : 'customer'

    // STATES
    
    // - Entities
    const [users, setUsers] = useState<UserRead[]>()
    const [user, setUser] = useState<UserRead>(initialUser)
    // - Computations
    const [names, setNames] = useState<React.ReactNode[]>()
    // - Values
    const [role, setRole] = useState<MemberRole>(initialRole)
    // - Interactions
    const [query, setQuery] = useState<string>('')

    // EFFECTS

    // - Entities
    useEffect(() => {
        let exec = true
        UserClient.findUsers(productId, query).then(users => exec && setUsers(users))
        return () => { exec = false }
    }, [productId, query])
    useEffect(() => {
        let exec = true
        member && UserClient.getUser(member.userId).then(user => exec && setUser(user))
        return () => { exec = false }
    }, [member] )

    // - Values
    useEffect(() => { member && setRole(member.role) }, [member] )

    // - Computations
    useEffect(() => {
        if (users) {
            setNames(users.map(user => {
                const name = user.name || ''
                const index = name.toLowerCase().indexOf(query.toLowerCase())
                const before = name.substring(0, index)
                const between = name.substring(index, index + query.length)
                const after = name.substring(index + query.length)
                return <Fragment>{before}<mark>{between}</mark>{after}</Fragment>
            }))
        }
    }, [users])

    // FUNCTIONS

    async function onSubmit(event: FormEvent) {
        // TODO handle unmount!
        event.preventDefault()
        if (memberId == 'new') {
            if (confirm('Do you really want to add this member?')) {
                await MemberClient.addMember(productId, { userId: user.userId, role: role })
                await goBack()
            }
        } else {
            if (confirm('Do you really want to change this member?')) {
                await MemberClient.updateMember(productId, memberId, { role: role })
                await goBack()
            }
        }
    }

    function handleClick(user: UserRead) {
        setUser(user)
    }

    // CONSTANTS

    const selectedUserColumns: Column<UserRead>[] = [
        { label: '👤', class: 'center', content: user => (
            <UserPictureWidget userId={user.userId} class='icon medium round'/>
        ) },
        { label: 'Name', class: 'left fill', content: user => (
            user ? user.name : '?'
        ) },
        { label: '🛠️', class: 'center', content: () => (
            memberId == 'new' && (
                <a onClick={() => setUser(null)}>
                    <img src={DeleteIcon} className='icon medium pad'/>
                </a>
            )
        ) }
    ]

    const queriedUserColumns: Column<UserRead>[] = [
        { label: '👤', class: 'center', content: user => (
            <UserPictureWidget userId={user.userId} class='icon medium round'/>
        ) },
        { label: 'Name', class: 'left fill', content: (_, index) => (
            names ? names[index] : '?'
        ) }
    ]

    const items: ProductFooterItem[] = [
        { text: 'Form view', image: LeftIcon, hash: '' },
        { text: 'Model view', image: RightIcon, hash: '#model' }
    ]
    
    // RETURN

    return (
        (product && members) ? (
            product.deleted ? (
                <Redirect to='/'/>
            ) : (
                <>
                    <main className={`view product-member-setting sidebar ${!hash ? 'hidden' : 'visible'}`}>
                        <div>
                            <div className='main'>
                                <h1>
                                    {memberId == 'new' ? (
                                        'New member'
                                    ) : (
                                        'Member settings'
                                    )}
                                </h1>
                                <form onSubmit={onSubmit}>
                                    {user ? (
                                        <>
                                            <div>
                                                <div>
                                                    <label>User</label>
                                                </div>
                                                <div>
                                                    <Table items={[user]} columns={selectedUserColumns}/>
                                                </div>
                                            </div>
                                            <div>
                                                <div>
                                                    <label>Role</label>
                                                </div>
                                                <div>
                                                    <select value={role} onChange={(event) => setRole(event.currentTarget.value as MemberRole)} className='button fill lightgray'> 
                                                        {ROLES.map(role => (
                                                            <option key={role} value={role}>
                                                                {role}
                                                            </option>
                                                        ))}    
                                                    </select>
                                                </div>
                                            </div>
                                            {contextUser ? (
                                                contextUser.admin || members.filter(member => member.userId == contextUser.userId && member.role == 'manager').length == 1 ? (
                                                    <ButtonInput value='Save'/>
                                                ) : (
                                                    <ButtonInput value='Save' badge='requires role' disabled={true}/>
                                                )
                                            ) : (
                                                <ButtonInput value='Save' badge='requires login' disabled={true}/>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <TextInput label='Search user' placeholder='Type name or full email' value={query} change={setQuery} input={setQuery}/>
                                            <div>
                                                <div>
                                                    <label>Matching users</label>
                                                </div>
                                                <div>
                                                    <Table items={users} columns={queriedUserColumns} onClick={handleClick}/>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </form>
                            </div>
                            <LegalFooter/>
                        </div>
                        <div>
                            <ProductView3D productId={productId} mouse={true}/>
                        </div>
                    </main>
                    <ProductFooter items={items}/>
                </>
            )
        ) : (
            <LoadingView/>
        )
    )
}
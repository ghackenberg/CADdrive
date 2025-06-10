import * as React from 'react'
import { Link } from 'react-router-dom'

import { UserRead } from 'productboard-common'

import { useUsers } from '../../hooks/list'
import { LegalFooter } from '../snippets/LegalFooter'
import { Column, Table } from '../widgets/Table'
import { UserPictureWidget } from '../widgets/UserPicture'
import { LoadingView } from './Loading'

import UserIcon from '/src/images/user.png'

export const UserView = () => {

    // ENTITIES

    const users = useUsers()

    // CONSTANTS

    const columns: Column<UserRead>[] = [
        { label: '👤', content: user => (
            <Link to={`/users/${user.userId}/settings`}>
                <UserPictureWidget userId={user.userId} class='icon medium round'/>
            </Link>
        ) },
        { label: 'Name', class: 'left nowrap fill', content: user => (
            <Link to={`/users/${user.userId}/settings`}>
                {user.name}
            </Link>
        ) }
    ]

    // RETURN

    return (
        users ? (
            <main className="view user">
                <div>
                    { users.length == 0 ? (
                        <div className='main center'>
                            <div>
                                <img src={UserIcon}/>
                                <p>No user found.</p>
                            </div>
                        </div>
                    ) : (
                        <div className='main'>
                            <Table columns={columns} items={users}/>
                        </div>
                    ) }
                    <LegalFooter/>
                </div>
            </main>
        ) : (
            <LoadingView/>
        )
    )

}
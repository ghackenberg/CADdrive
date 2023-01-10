import * as React from 'react'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

import { User } from 'productboard-common'

import { UserManager } from '../../managers/user'
import { UsersLink } from '../links/UsersLink'
import { Column, Table } from '../widgets/Table'
import { UserPictureWidget } from '../widgets/UserPicture'

import * as DeleteIcon from '/src/images/delete.png'

export const UserView = () => {

    // INITIAL STATES

    const initialUsers = UserManager.findUsersFromCache()

    // STATES

    // - Entities
    const [users, setUsers] = useState<User[]>(initialUsers)

    // EFFECTS

    // - Entities
    useEffect(() => { UserManager.findUsers().then(setUsers) }, [])

    // FUNCTIONS

    async function deleteUser(user: User) {
        if (confirm('Do you really want to delete this user?')) {
            await UserManager.deleteUser(user.id)
            setUsers(users.filter(other => other.id != user.id))
        }
    }

    // CONSTANTS

    const columns: Column<User>[] = [
        { label: 'Picture', content: user => (
            <Link to={`/users/${user.id}/settings`}>
                <UserPictureWidget user={user} class='big'/>
            </Link>
        ) },
        { label: 'Name', class: 'left nowrap', content: user => (
            <Link to={`/users/${user.id}/settings`}>
                {user.name}
            </Link>
        ) },
        { label: 'Email', class: 'left nowrap', content: user => (
            <Link to={`/users/${user.id}/settings`}>
                {user.email}
            </Link>
        ) },
        { label: '',class: 'fill right', content: user => (
            <a onClick={() => deleteUser(user)}>
                <img src={DeleteIcon} className='small'/>
            </a>
        ) }
    ]

    // RETURN

    return (
        <main className="view users">
            <header>
                <div>
                    <UsersLink/>
                </div>
            </header>
            <main>
                <div>
                    <Link to={`/users/new/settings`} className='button green fill'>
                        New user
                    </Link>
                    {users && (
                        <Table columns={columns} items={users}/>
                    )}
                </div>
            </main>
        </main>
    )

}
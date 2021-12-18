import * as React from 'react'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
// Commons
import { User } from 'productboard-common'
// Clients
import { UserAPI } from '../../clients/rest'
// Links
import { UsersLink } from '../links/UsersLink'
// Widgets
import { Column, Table } from '../widgets/Table'
// Images
import * as DeleteIcon from '/src/images/delete.png'

export const UsersView = () => {

    // Define entities
    const [users, setUsers] = useState<User[]>()

    // Load entities
    useEffect(() => { UserAPI.findUsers().then(setUsers) }, [])

    const columns: Column<User>[] = [
        {label: 'Name', class: 'left nowrap', content: user => <Link to={`/users/${user.id}`}>{user.name}</Link>},
        {label: 'Email', class: 'left nowrap fill', content: user => <Link to={`/users/${user.id}`}>{user.email}</Link>},
        {label: '', content: () => <img src={DeleteIcon}/>}
    ]

    return (
        <main className="view users">
            <header>
                <div>
                    <UsersLink/>
                </div>
            </header>
            <main>
                <div>
                    <Link to={`/users/new/settings`}>
                        New user
                    </Link>
                    { users && <Table columns={columns} items={users}/> }
                </div>
            </main>
        </main>
    )

}
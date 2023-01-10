import * as React from 'react'
import { useContext } from 'react'
import { NavLink } from 'react-router-dom'

import { UserContext } from '../../contexts/User'

import * as UserIcon from '/src/images/user.png'

export const UsersLink = () => {
    const user = useContext(UserContext)
    return (
        <span>
            {user.permissions.includes('create:users') ? (
                <NavLink to="/users">
                    <img src={UserIcon}/>
                    Users
                </NavLink>
            ) : (
                <>Users</>
            )}
        </span>
    )
}
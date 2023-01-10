import * as React from 'react'
import { useContext } from 'react'
import { NavLink } from 'react-router-dom'

import { UserContext } from '../../contexts/User'
import { UserPictureWidget } from '../widgets/UserPicture'

import * as AppIcon from '/src/images/app.png'
import * as UserIcon from '/src/images/user.png'

export const PageHeader = () => {

    const user = useContext(UserContext)

    return (
        <header>
            <div>
                <span>
                    <NavLink to="/products">
                        <img src={AppIcon}/>
                        ProductBoard
                    </NavLink>
                </span>
            </div>
            <div>
                <span>
                    {user && user.permissions && user.permissions.includes('create:users') && (
                        <NavLink to="/users">
                            <img src={UserIcon}/>
                            Users
                        </NavLink>
                    )}
                </span>
                <span>
                    {user && user.id && (
                        <NavLink to={`/users/${user.id}/settings`}>
                            <UserPictureWidget user={user} background='gray'/>
                        </NavLink>
                    )}
                </span>
            </div>
        </header>
    )
    
}
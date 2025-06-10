import * as React from 'react'
import { useContext } from 'react'
import { NavLink, Route, Switch } from 'react-router-dom'

import { UserContext } from '../../contexts/User'
import { useAsyncHistory } from '../../hooks/history'
import { UserPictureWidget } from '../widgets/UserPicture'

import AppIcon from '/src/images/app.png'
import BackIcon from '/src/images/back.png'
import LoadIcon from '/src/images/load.png'

export const PageHeaderRoot = () => {

    const { goBack } = useAsyncHistory()

    const { contextUser } = useContext(UserContext)

    async function handleClick(event: React.UIEvent) {
        event.preventDefault()
        await goBack()
    }

    return (
        <header className='page'>
            <div>
                <span>
                    <Switch>
                        <Route path="/legal">
                            <a onClick={handleClick}>
                                <img src={BackIcon} className='icon small'/>
                                <span>Back</span>
                            </a>
                        </Route>
                        <Route path="/auth">
                            <a onClick={handleClick}>
                                <img src={BackIcon} className='icon small'/>
                                <span>Back</span>
                            </a>
                        </Route>
                        <Route path="/users">
                            <a onClick={handleClick}>
                                <img src={BackIcon} className='icon small'/>
                                <span>Back</span>
                            </a>
                        </Route>
                        <Route path="/products/:productId">
                            <a onClick={handleClick}>
                                <img src={BackIcon} className='icon small'/>
                                <span>Back</span>
                            </a>
                        </Route>
                        <Route>
                            <NavLink to="/products" replace={true}>
                                <img src={AppIcon} className='icon small'/>
                                <span>CAD</span>
                                <span>drive</span>
                                <span>Your collaborative workspace for LDraw&trade; models</span>
                            </NavLink>
                        </Route>
                    </Switch>
                </span>
            </div>
            <div>
                <span>
                    <Switch>
                        <Route path="/legal">

                        </Route>
                        <Route path="/auth">

                        </Route>
                        <Route>
                            {contextUser === undefined && (
                                <a>
                                    <img src={LoadIcon} className='icon small animation spin'/>
                                </a>
                            )}
                            {contextUser === null && (
                                <NavLink to='/auth/email' className='button fill white' style={{lineHeight: '100%'}}>
                                    Sign up / in
                                </NavLink>
                            )}
                            {contextUser && (
                                <NavLink to={`/users/${contextUser.userId}/settings`}>
                                    <UserPictureWidget userId={contextUser.userId} background='gray' class='icon small round'/>
                                </NavLink>
                            )}
                        </Route>
                    </Switch>
                </span>
            </div>
        </header>
    )
    
}
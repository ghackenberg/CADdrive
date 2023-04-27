import * as React from 'react'
import { Redirect, useHistory } from 'react-router'

import { AuthContext } from '../../contexts/Auth'
import { UserManager } from '../../managers/user'

import AuthIcon from '/src/images/auth.png'

export const AuthNameView = () => {
    const { push } = useHistory()

    // CONTEXTS

    const { authContextUser, setAuthContextUser } = React.useContext(AuthContext)

    // STATES

    const [name, setName] = React.useState<string>(authContextUser ? authContextUser.name || '' : '')

    const [load, setLoad] = React.useState<boolean>(false)
    const [error, setError] = React.useState<string>()

    // FUNCTIONS

    async function handleSubmit(event: React.UIEvent) {
        try {
            event.preventDefault()
            setLoad(true)
            setError(undefined)
            const user = await UserManager.updateUser(authContextUser.id, { consent: authContextUser.consent, name })
            setAuthContextUser(user)
            setLoad(false)
            push('/auth/picture')
        } catch (e) {
            setError('Action failed.')
            setLoad(false)
        }
    }

    return (
        authContextUser ? (
            <main className='view reduced auth'>
                <main>
                    <div>
                        <div>
                            <div>
                                <img src={AuthIcon}/>
                                <h5>Authentication process</h5>
                                <h1>Step 4: <span>Profile name</span></h1>
                                <p>
                                    How do you want to be called on our platform?
                                    Note that your profile name will be visible to other users.
                                </p>
                                <div>
                                    <input className='button fill lightgray' type='text' placeholder='Your profile name' value={name} onKeyUp={event => event.key == 'Enter' && handleSubmit(event)} onChange={event => setName(event.currentTarget.value)}/>
                                    <button className='button fill blue' onClick={handleSubmit}>
                                        {load ? 'Loading ...' : 'Next'}
                                    </button>
                                </div>
                                {error && <p style={{color: 'red'}}>{error}</p>}
                            </div>
                        </div>
                    </div>
                </main>
            </main>
        ) : (
            <Redirect to="/auth"/>
        )
    )
}
import  * as React from 'react'
import { useState, useEffect, Fragment, FormEvent } from 'react'
import { useHistory } from 'react-router'
import { RouteComponentProps } from 'react-router-dom'
// Commons
import { User } from 'fhooe-audit-platform-common'
// Clients
import { UserAPI } from '../../clients/rest'
// Snippets
import { Header } from '../snippets/Header'
import { Navigation } from '../snippets/Navigation'
// Links
import { UserLink } from '../links/UserLink'
// Inputs
import { TextInput } from '../inputs/TextInput'
import { EmailInput } from '../inputs/EmailInput'

export const UserEditView = (props: RouteComponentProps<{ user: string }>) => {

    const userId = props.match.params.user
    
    const history = useHistory()

    // Define entities
    const [user, setUser] = useState<User>()

    // Define values
    const [email, setEmail] = useState<string>('')
    const [name, setName] = useState<string>('')

    // Load entities
    useEffect(() => { userId == 'new' || UserAPI.getUser(userId).then(setUser) }, [props])

    // Load values
    useEffect(() => { user && setEmail(user.email) }, [user])
    useEffect(() => { user && setName(user.name) }, [user])

    async function submit(event: FormEvent){
        event.preventDefault()
        if(userId == 'new') {
            if (name && email) {
                const user = await UserAPI.addUser({ name, email })
                history.replace(`/users/${user.id}`)
            }
        } else {
            if (name && email) {
                setUser(await UserAPI.updateUser({ id: user.id, name, email}))
            }
        }       
    }

    async function reset() {
        history.goBack()
    }

    return (
        <div className="view user">
            <Header/>
            <Navigation/>
            <main>
                { userId == 'new' || user ? (
                    <Fragment>
                        <nav>
                            <UserLink user={user}/>
                        </nav>
                        <h1>User editor</h1>
                        <h2>Property form</h2>
                        <form onSubmit={submit} onReset={reset}>
                            <EmailInput label='Email' placeholder='Type email' value={email} change={setEmail}/>
                            <TextInput label='Name' placeholder='Type name' value={name} change={setName}/>
                            <div>
                                <div/>
                                <div>
                                    { userId == 'new' && <input type='reset' value='Cancel'/> } 
                                    <input type='submit' value='Save'/>
                                </div>
                            </div>
                        </form>
                    </Fragment>
                ) : (
                    <p>Loading...</p>
                )}
            </main>
        </div>
    )
    
}
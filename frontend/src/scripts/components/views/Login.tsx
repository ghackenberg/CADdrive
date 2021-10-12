import * as React from 'react'
import { Fragment } from 'react'
// Commons
import { User } from 'fhooe-audit-platform-common'
// Clients
import { auth } from '../../clients/auth'
import { UserAPI } from '../../clients/rest'
// Snippets
import { Header } from '../snippets/Header'
// Inputs
import { EmailInput } from '../inputs/EmailInput'
import { PasswordInput } from '../inputs/PasswordInput'

export const LoginView = (props: {callback: (user: User) => void}) => {

    const [load, setLoad] = React.useState<boolean>(false)
    const [error, setError] = React.useState<string>()
    const [email, setEmail] = React.useState<string>(localStorage.getItem('username') || '')
    const [password, setPassword] = React.useState<string>(localStorage.getItem('password') || '')

    async function check() {
        setLoad(true)

        auth.username = email
        auth.password = password
        
        try {
            props.callback(await UserAPI.checkUser())
        } catch (error) {
            setError('Login failed!')
            setLoad(false)
        }
    }

    async function submit(event: React.FormEvent) {
        event.preventDefault()

        localStorage.setItem('username', email)
        localStorage.setItem('password', password)

        await check()
    }
    async function reset() {
        setEmail('')
        setPassword('')
    }

    React.useEffect(() => { check() }, [])

    return (
        <div className="view login">
            <Header/>
            <main>
                <Fragment>
                    <h1>Login to Virtual Engineering Platform</h1>
                    {load ? (
                        <p>Loading...</p>
                    ) : (
                        <Fragment>
                            {error && <p style={{color: 'red'}}>{error}</p>}
                            <form onSubmit={submit} onReset={reset}>
                                <EmailInput label='Email' placeholder='Type email' value={email} change={setEmail}/>
                                <PasswordInput label='Password' placeholder='Type password' value={password} change={setPassword}/>
                                <div>
                                    <div/>
                                    <div>
                                        <input  type='reset' value='Cancel'/>
                                        <input  type='submit' value='Login'/>
                                    </div>
                                </div>
                            </form>
                        </Fragment>
                    )}
                </Fragment>
            </main>
        </div>
    )
    
}
import * as React from 'react'
import { useHistory, useParams } from 'react-router'

import { JWK, JWTVerifyResult, KeyLike, importJWK, jwtVerify } from 'jose'

import { auth } from '../../clients/auth'
import { TokenClient } from '../../clients/rest/token'
import { UserContext } from '../../contexts/User'
import { KeyManager } from '../../managers/key'
import { UserManager } from '../../managers/user'

import AuthIcon from '/src/images/auth.png'

export const AuthCodeView = () => {
    const { push } = useHistory()

    // PARAMS

    const { id } = useParams<{ id: string }>()

    // CONTEXTS

    const { setContextUser } = React.useContext(UserContext)

    // STATES

    const [publicJWK, setPublicJWK] = React.useState<JWK>()
    const [publicKey, setPublicKey] = React.useState<KeyLike | Uint8Array>()
    const [jwtVerifyResult, setJWTVerifyResult] = React.useState<JWTVerifyResult>()
    const [payload, setPayload] = React.useState<{ userId: string }>()
    const [userId, setUserId] = React.useState<string>()

    const [code, setCode] = React.useState<string>('')
    const [jwt, setJWT] = React.useState<string>()

    const [load, setLoad] = React.useState<boolean>(false)
    const [error, setError] = React.useState<string>()

    // EFFECTS

    React.useEffect(() => {
        KeyManager.getPublicJWK().then(setPublicJWK)
    }) 
    React.useEffect(() => {
        publicJWK && importJWK(publicJWK, "PS256").then(setPublicKey)
    }, [publicJWK])
    React.useEffect(() => {
        jwt && publicKey && jwtVerify(jwt, publicKey).then(setJWTVerifyResult)
    }, [jwt, publicKey])
    React.useEffect(() => {
        jwtVerifyResult && setPayload(jwtVerifyResult.payload as { userId: string })
    }, [jwtVerifyResult])
    React.useEffect(() => {
        payload && setUserId(payload.userId)
    }, [payload])
    React.useEffect(() => {
        if (userId) {
            setLoad(true)
            setError(undefined)
            UserManager.getUser(userId).then(user => {
                setContextUser(user)
                setLoad(false)
                if (!user.consent || !user.name) {
                    push('/auth/consent')
                } else {
                    push('/')
                }
            }).catch(() => {
                setError('Action failed.')
                setLoad(false)
            })
        } 
    }, [userId])

    // EVENTS

    async function handleSubmit(event: React.UIEvent) {
        try {
            event.preventDefault()
            setLoad(true)
            setError(undefined)
            const token = await TokenClient.activateToken(id, { code })
            localStorage.setItem('jwt', token.jwt)
            auth.headers.Authorization = `Bearer ${token.jwt}`
            setJWT(token.jwt)
            setLoad(false)
        } catch (e) {
            setError('Action failed.')
            setLoad(false)
        }
    }

    return (
        <main className="view reduced auth">
            <main>
                <div>
                    <div>
                        <div>
                            <img src={AuthIcon}/>
                            <h5>Authentication process</h5>
                            <h1>Step 2: <span>Verification code</span></h1>
                            <p>
                                Please check your <strong>email inbox</strong>.
                                You should find your <strong>verification code</strong> there.
                                Then enter your code below and press <strong>next</strong>.
                            </p>
                            <div>
                                <input className='button fill lightgray' type="text" placeholder='Your verification code' minLength={6} maxLength={6} value={code} onKeyUp={event => event.key == 'Enter' && handleSubmit(event)} onChange={event => setCode(event.currentTarget.value)}/>
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
    )
}
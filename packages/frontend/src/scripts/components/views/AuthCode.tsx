import * as React from 'react'

import { JWK, JWTVerifyResult, importJWK, jwtVerify } from 'jose'

import { auth } from '../../clients/auth'
import { CacheAPI } from '../../clients/cache'
import { TokenClient } from '../../clients/rest/token'
import { UserClient } from '../../clients/rest/user'
import { AuthContext } from '../../contexts/Auth'
import { UserContext } from '../../contexts/User'
import { useAsyncHistory } from '../../hooks/history'
import { LegalFooter } from '../snippets/LegalFooter'

import AuthIcon from '/src/images/auth.png'

export const AuthCodeView = () => {
    
    const { go, replace } = useAsyncHistory()

    // REFS

    const inputRef = React.createRef<HTMLInputElement>()

    // CONTEXTS

    const { authContextToken, setAuthContextUser } = React.useContext(AuthContext)
    const { setContextUser } = React.useContext(UserContext)

    // STATES

    const [publicJWK, setPublicJWK] = React.useState<JWK>()
    const [publicKey, setPublicKey] = React.useState<CryptoKey | Uint8Array>()
    const [jwtVerifyResult, setJWTVerifyResult] = React.useState<JWTVerifyResult>()
    const [payload, setPayload] = React.useState<{ userId: string }>()
    const [userId, setUserId] = React.useState<string>()

    const [code, setCode] = React.useState<string>('')
    const [jwt, setJWT] = React.useState<string>()

    const [load, setLoad] = React.useState<boolean>(false)
    const [error, setError] = React.useState<string>()

    // EFFECTS

    React.useEffect(() => {
        inputRef.current.focus()
    })

    React.useEffect(() => {
        let exec = true
        CacheAPI.loadPublicJWK().then(publicJWK => exec && setPublicJWK(publicJWK))
        return () => { exec = false }
    })

    React.useEffect(() => {
        let exec = true
        publicJWK && importJWK(publicJWK, "PS256").then(publicKey => exec && setPublicKey(publicKey))
        return () => { exec = false }
    }, [publicJWK])

    React.useEffect(() => {
        let exec = true
        jwt && publicKey && jwtVerify(jwt, publicKey).then(jwtVerifyResult => exec && setJWTVerifyResult(jwtVerifyResult))
        return () => { exec = false }
    }, [jwt, publicKey])

    React.useEffect(() => {
        jwtVerifyResult && setPayload(jwtVerifyResult.payload as { userId: string })
    }, [jwtVerifyResult])
    
    React.useEffect(() => {
        payload && setUserId(payload.userId)
    }, [payload])

    React.useEffect(() => {
        let exec = true
        if (userId) {
            setLoad(true)
            setError(undefined)
            UserClient.getUser(userId).then(async user => {
                if (exec) {
                    if (!user.consent || !user.name) {
                        setAuthContextUser(user)
                        setLoad(false)
                        await replace('/auth/consent')
                    } else {
                        setContextUser(user)
                        setLoad(false)
                        await go(-2)
                    }
                }
            }).catch(() => {
                setError('Action failed.')
                setLoad(false)
            })
        }
        return () => { exec = false }
    }, [userId])

    // EVENTS

    async function handleSubmit(event: React.UIEvent) {
        // TODO handle unmount!
        try {
            event.preventDefault()
            setLoad(true)
            setError(undefined)
            const token = await TokenClient.activateToken(authContextToken, { code })
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
        <main className="view auth code">
            <div>
                <div className='main center'>
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
                            <input ref={inputRef} className='button fill lightgray' type="text" placeholder='Your verification code' minLength={6} maxLength={6} value={code} onKeyUp={event => event.key == 'Enter' && handleSubmit(event)} onChange={event => setCode(event.currentTarget.value)}/>
                            <button className='button fill red' onClick={handleSubmit}>
                                {load ? 'Loading ...' : 'Next'}
                            </button>
                        </div>
                        {error && <p style={{color: 'var(--red)'}}>{error}</p>}
                    </div>
                </div>
                <LegalFooter/>
            </div>
        </main>
    )
}
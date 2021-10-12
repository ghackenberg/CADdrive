import * as React from 'react'
import { Helmet } from 'react-helmet'
import { BrowserRouter, Route, Switch } from 'react-router-dom'
import { User } from 'fhooe-audit-platform-common'
import { LoginView } from './views/Login'
import { HomeView } from './views/Home'
import { UserListView } from './views/UserList'
import { ProductListView } from './views/ProductList'
import { UserEditView } from './views/UserEdit'
import { ProductEditView } from './views/ProductEdit'
import { VersionEditView } from './views/VersionEdit'
import { AuditEditView } from './views/AuditEdit'
import { AuditJoinView } from './views/AuditJoin'
import { ModelView } from './views/Model'
import { UserContext } from '../context'
import { auth } from '../auth'
import * as PlatformIcon from '/src/images/platform.png'

export const Root = () => {
    const [user, setUser] = React.useState<User>()

    function callback() {
        localStorage.removeItem('username')
        localStorage.removeItem('password')

        auth.username = undefined
        auth.password = undefined

        setUser(undefined)
    }
    
    return <React.Fragment>
        <Helmet>
            <link rel="icon" href={PlatformIcon}/>
        </Helmet>
        <BrowserRouter>
            {user ? (
                <UserContext.Provider value={{callback, ...user}}>
                    <Switch>
                        {/* User views */}
                        <Route path="/users/:user" component={UserEditView}/>
                        <Route path="/users" component={UserListView}/>
                        {/* Product views */}
                        <Route path="/products/:product" component={ProductEditView}/>
                        <Route path="/products" component={ProductListView}/>
                        {/* Version views */}
                        <Route path="/versions/:version" component={VersionEditView}/>
                        {/* Audit views */}
                        <Route path="/audits/:audit/join" component={AuditJoinView}/>
                        <Route path="/audits/:audit" component={AuditEditView}/>
                        {/* Model views */}
                        <Route path="/models/:model" component={ModelView}/>
                        {/* Home view */}
                        <Route component={HomeView}/>
                    </Switch>
                </UserContext.Provider>
            ) : (
                <LoginView callback={setUser}/>
            )}
        </BrowserRouter>
    </React.Fragment>
}
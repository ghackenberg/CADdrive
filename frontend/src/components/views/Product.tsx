import * as React from 'react'
import { Link, RouteComponentProps } from 'react-router-dom'
import { Header } from '../snippets/Header'
import { Navigation } from '../snippets/Navigation'

export class Product extends React.Component<RouteComponentProps<{id: string}>> {
    render() {
        return (
            <React.Fragment>
                <Header/>
                <Navigation/>
                <main>
                    <h1><Link to="/">Index</Link> &rsaquo; <Link to="/products">Products</Link> &rsaquo; {this.props.match.params.id}</h1>
                    <p>TODO</p>
                </main>
            </React.Fragment>
        )
    }
}
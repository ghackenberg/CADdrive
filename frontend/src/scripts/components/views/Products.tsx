import * as React from 'react'
import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { Header } from '../snippets/Header'
import { Navigation } from '../snippets/Navigation'
import { SearchBarList } from '../widgets/SearchBarList'

export const ProductsView = () => {
    
    return (
        <div className="view products">
            <Header/>
            <Navigation/>
            <main>
                <Fragment>
                    <nav>
                        <span>
                            <Link to="/">Welcome Page</Link>
                        </span>
                        <span>
                            <a>Products</a>
                        </span>
                    </nav>
                </Fragment>
                <h2>Available products</h2>
                <SearchBarList type='products'/>
            </main>
        </div>
    )
}
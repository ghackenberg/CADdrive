import * as React from 'react'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Product } from 'fhooe-audit-platform-common'
import { ProductAPI } from '../../rest'
import { Header } from '../snippets/Header'
import { Navigation } from '../snippets/Navigation'
import { ProductList } from '../widgets/ProductList'

export const Products = () => {
    const [products, setProducts] = useState<Product[]>(null)
    useEffect(() => { ProductAPI.findAll().then(setProducts) }, [])
    return (
        <div className="view products">
            <Header/>
            <Navigation/>
            <main>
                <h1><Link to="/">Welcome Page</Link> &rsaquo; Products</h1>
                <h2>Available products</h2>
                {products ? <ProductList list={products}/> : <p>Loading...</p>}
            </main>
        </div>
    )
}
import * as React from 'react'

export interface Column <T,> {
    class?: string
    label: React.ReactNode
    content: (item: T, index: number) => React.ReactNode
}

export const Table = <T,> (props: {columns: Column<T>[], items: T[]}) => (
    <table>
        <thead>
            <tr>
                {props.columns.map((column, index) =>
                    <th key={`head-cell-${index}`} className={column.class}>
                        {column.label}
                    </th>
                )}
            </tr>
        </thead>
        <tbody>
            {props.items.map((item, itemIndex) =>
                <tr key={`body-row-${itemIndex}`}>
                    {props.columns.map((column, columnIndex) =>
                        <td key={`body-cell-${columnIndex}`} className={column.class}>
                            {column.content(item, itemIndex)}
                        </td>
                    )}
                </tr>
            )}
            {props.items.length == 0 && (
                <tr>
                    <td colSpan={props.columns.length} className='center'>
                        <em>Empty</em>
                    </td>
                </tr>
            )}
        </tbody>
    </table>
)
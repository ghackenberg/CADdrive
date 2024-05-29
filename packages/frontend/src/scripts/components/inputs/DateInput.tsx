import * as React from 'react'

import { GenericInput } from './GenericInput'

export const DateInput = (props: {class?: string, label: string, change?: (value: Date) => void, value: Date, placeholder?: string, disabled?: boolean, required?: boolean}) => {
    const label = props.label
    const type = 'datetime-local'
    const className = `button fill ${props.class || 'lightgray'}`
    const placeholder = props.placeholder
    const valueAsDate = (props.value ? props.value : new Date())
    const value = `${valueAsDate.toISOString().substring(0,11)}${valueAsDate.toLocaleTimeString()}`
    const disabled = props.disabled
    const required = props.required

    function onChange(event: React.ChangeEvent<HTMLInputElement>) {
        console.log(event.currentTarget.value)
        props.change && props.change(new Date(event.currentTarget.value))
    }
    
    return (
        <GenericInput label={label}>
            <input type={type} className={className} placeholder={placeholder} value={value} disabled={disabled} required={required} onChange={onChange}/>
        </GenericInput>
    )
}
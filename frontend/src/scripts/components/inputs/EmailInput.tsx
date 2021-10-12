import * as React from 'react'
// Inputs
import { GenericInput } from './GenericInput'

export const EmailInput = (props: {label: string, change?: (value: string) => void, value: string, placeholder?: string, disabled?: boolean}) => {
    return (
        <GenericInput label={props.label}>
            <input
                type='email'
                placeholder={props.placeholder}
                value={props.value}
                disabled={props.disabled}
                onChange={event => {props.change(event.currentTarget.value)}}
                required/>
        </GenericInput>
    )
}
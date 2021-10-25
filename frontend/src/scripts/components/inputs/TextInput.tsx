import * as React from 'react'
// Inputs
import { GenericInput } from './GenericInput'

export const TextInput = (props: {value: string, label?: string, change?: (value: string) => void, placeholder?: string, disabled?: boolean}) => {
    return (
        <GenericInput label={props.label}>
            <input
                type='text'
                placeholder={props.placeholder}
                value={props.value}
                disabled={props.disabled}
                onChange={event => {props.change(event.currentTarget.value)}}
                required/>
        </GenericInput>
    )
}
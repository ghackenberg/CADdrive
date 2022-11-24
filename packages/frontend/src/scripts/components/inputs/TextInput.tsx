import * as React from 'react'

import { GenericInput } from './GenericInput'

export const TextInput = (props: {class?: string, value: string, label?: string, input?: (value: string) => void, change?: (value: string) => void, placeholder?: string, disabled?: boolean, required?: boolean}) => (
    <GenericInput label={props.label}>
        <input
            type='text'
            className={props.class}
            placeholder={props.placeholder}
            value={props.value}
            disabled={props.disabled}
            onChange={event => {props.change && props.change(event.currentTarget.value)}}
            onInput={event => {props.input && props.input(event.currentTarget.value)}}
            required = {props.required}/>
    </GenericInput>
)
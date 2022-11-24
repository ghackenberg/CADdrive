import * as React from 'react'

import { GenericInput } from './GenericInput'

export const TextareaInput = (props: {class?: string, value: string, label?: string, change?: (value: string) => void, placeholder?: string, disabled?: boolean}) => (
    <GenericInput label={props.label}>
        <textarea
            className={props.class}
            placeholder={props.placeholder}
            value={props.value}
            disabled={props.disabled}
            onChange={event => {props.change(event.currentTarget.value)}}
            required/>
    </GenericInput>
)
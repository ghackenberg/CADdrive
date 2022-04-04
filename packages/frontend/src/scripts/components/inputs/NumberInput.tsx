import * as React from 'react'
// Inputs
import { GenericInput } from './GenericInput'

export const NumberInput = (props: {class?: string, label: string, change: (value: number) => void, value: number, placeholder?: string, disabled?: boolean}) => (
    <GenericInput label={props.label}>
        <input
            type='number'
            className={props.class}
            placeholder={props.placeholder}
            value={props.value}
            disabled={props.disabled}
            onChange={event => {props.change(event.currentTarget.valueAsNumber)}}
            required/>
    </GenericInput>
)
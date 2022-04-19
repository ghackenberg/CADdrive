import * as React from 'react'
import { useEffect, useState } from 'react'
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from 'recharts'

export const BurndownChartWidget = (props: { start: Date, end: Date, total: number, actual: { time: number, actual: number }[] }) => {
    
    // STATES
    
    // - Computations
    const [min, setMinimumTime] = useState<number>()
    const [max, setMaximumTime] = useState<number>()
    const [target, setTargetBurndown] = useState<{ time: number, target: number}[]>([])

    // EFFECTS

    // - Computations
    useEffect(() => {
        if (props.start && props.end && props.actual) {
            var min = Math.min(props.start.getTime(), props.end.getTime())
            var max = Math.max(props.start.getTime(), props.end.getTime())

            for (const data of props.actual) {
                min = Math.min(min, data.time)
                max = Math.max(max, data.time)
            }

            setMinimumTime(min)
            setMaximumTime(max)
        }
    }, [props])
    useEffect(() => {
        if (min && max && props.total) {
            const target: { time: number, target: number }[] = []
            const days = (max - min) / (1000 * 60 * 60 * 24)
            const delta = props.total / days
            var value = props.total
            for (var iterator = min; iterator <= max; iterator += 1000 * 60 * 60 * 24) {
                target.push({ time: iterator, target: value })
                value -= delta
            }
            setTargetBurndown(target)
        }
    }, [min, max, props.total])

    // RETURN

    return (
        <ResponsiveContainer>
            <LineChart>
                <CartesianGrid/>
                <XAxis name='Time' dataKey='time' type='number' domain={[min - (max - min) * 0.25, max + (max - min) * 0.25]} scale='time' tickFormatter={time => new Date(time).toLocaleString()}/>
                <YAxis name='Open issue count' dataKey='target' allowDecimals={false}/>
                <Legend/>
                <Line name='Target burndown' data={target} dataKey='target' stroke='green' strokeDasharray='3 3' dot={false}/>
                <ReferenceLine x={props.start.getTime()} label='Start' stroke='red' strokeDasharray='3 3'/>
                <ReferenceLine x={props.end.getTime()} label='End' stroke='red' strokeDasharray='3 3'/>
                { Date.now() >= props.start.getTime() && Date.now() <= props.end.getTime() && (
                    <ReferenceLine x={Date.now()} label='Now' stroke='gray' strokeDasharray='3 3'/>
                ) }
                <ReferenceLine y={props.total} label='Total' stroke='orange' strokeDasharray='3 3'/>
                <Line name='Actual burndown' data={props.actual} dataKey='actual' stroke='blue'/>
            </LineChart>
        </ResponsiveContainer>
    )

}
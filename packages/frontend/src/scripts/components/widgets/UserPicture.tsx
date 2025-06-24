import * as React from 'react'

import { useUser } from '../../hooks/entity'

import PixelIcon from '/src/images/pixel.png'
import UserIcon from '/src/images/user.png'

export const UserPictureWidget = (props: { userId: string, background?: string, class?: string }) => {
    const user = useUser(props.userId)

    const src = user && !user.deleted ? UserIcon : PixelIcon

    const title =  user ? user.name : 'Loading user information...'

    const className = props.class

    const backgroundImage = `url(${user && user.pictureId ? `/rest/files/${user.pictureId}.jpg` : UserIcon})`
    const backgroundSize = 'cover'
    const backgroundPosition = 'center'
    const backgroundColor = props.background || 'lightgray'

    const style = { backgroundImage, backgroundSize, backgroundPosition, backgroundColor }

    return <img src={src} title={title} style={style} className={className}/>
}
import * as React from 'react'
import { Fragment } from 'react'

import { Member, User } from 'productboard-common'

import * as DiagonalIcon from '/src/images/diagonal.png'
import * as PixelIcon from '/src/images/pixel.png'
import * as UserIcon from '/src/images/user.png'

export const ProductUserPictureWidget = (props: { user: User, members: Member[], class?: string }) => {
    const className = props.class

    const backgroundImage = `url(${props.user.pictureId ? `/rest/files/${props.user.pictureId}.jpg` : UserIcon})`
    const backgroundSize = 'cover'
    const backgroundPosition = 'center'
    const backgroundColor = 'lightgray'

    const style = { backgroundImage, backgroundSize, backgroundPosition, backgroundColor }

    const isDeleted = props.user.deleted
    const isMember = props.members.map(member => member.userId).includes(props.user.id)

    return (
        <Fragment>
            {isDeleted ? (
                <img src={UserIcon} style={style} className={className}/>
            ) : (
                <Fragment>
                    {isMember ? (
                        <img src={PixelIcon} style={style} className={className}/>
                    ) : (
                        <img src={DiagonalIcon} style={style} className={className}/>
                    )}
                </Fragment>
            )}
        </Fragment>
    )
}
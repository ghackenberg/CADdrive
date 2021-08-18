import { Version } from 'fhooe-audit-platform-common'
import * as React from 'react'
import { Link } from 'react-router-dom'
import * as VersionIcon from '/src/images/version.png'
import * as CreateIcon from '/src/images/create.png'

export const VersionList = (props: {list: Version[]}) => (
    <div className="widget list version_list">
        <ul>
            {props.list.map(version =>
                <li key={version.id}>
                    <Link to={`/versions/${version.id}`}><img src={VersionIcon}/>Version <em>{version.name}</em></Link>
                </li>
            )}
            <li>
                <Link to="/versions/new"><img src={CreateIcon}/>Version</Link>
            </li>
        </ul>
    </div>
)
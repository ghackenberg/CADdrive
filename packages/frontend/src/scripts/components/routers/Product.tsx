import * as React from 'react'
import { Redirect, Route, Switch } from 'react-router'

import { ProductHeader } from '../snippets/ProductHeader'
import { ProductIssueView } from '../views/ProductIssue'
import { ProductIssueCommentView } from '../views/ProductIssueComment'
import { ProductIssueSettingView } from '../views/ProductIssueSetting'
import { ProductMemberView } from '../views/ProductMember'
import { ProductMemberSettingView } from '../views/ProductMemberSetting'
import { ProductMilestoneView } from '../views/ProductMilestone'
import { ProductMilestoneIssueView } from '../views/ProductMilestoneIssue'
import { ProductMilestoneIssueCommentView } from '../views/ProductMilestoneIssueComment'
import { ProductMilestoneIssueSettingView } from '../views/ProductMilestoneIssueSetting'
import { ProductMilestoneSettingView } from '../views/ProductMilestoneSetting'
import { ProductSettingView } from '../views/ProductSetting'
import { ProductVersionView } from '../views/ProductVersion'
import { ProductVersionEditorView } from '../views/ProductVersionEditor'
import { ProductVersionMergeView } from '../views/ProductVersionMerge'
import { ProductVersionSettingView } from '../views/ProductVersionSetting'

const ProductRouter = () => {
    // TODO Include version 3D visualization and milestone chart visualization here. Switch based on context.
    return (
        <>
            <ProductHeader/>
            <Switch>
                <Route path="/products/:productId/settings" component={ProductSettingView}/>

                <Route path="/products/:productId/members/:memberId/settings" component={ProductMemberSettingView}/>
                <Redirect path="/products/:productId/members/:memberId" to="/products/:productId/members/:memberId/settings" push={false}/>
                <Route path="/products/:productId/members" component={ProductMemberView}/>

                <Route path="/products/:productId/milestones/:milestoneId/issues/:issueId/comments" component={ProductMilestoneIssueCommentView}/>
                <Route path="/products/:productId/milestones/:milestoneId/issues/:issueId/settings" component={ProductMilestoneIssueSettingView}/>
                <Route path="/products/:productId/milestones/:milestoneId/issues" component={ProductMilestoneIssueView}/>
                <Route path="/products/:productId/milestones/:milestoneId/settings" component={ProductMilestoneSettingView}/>
                <Redirect path="/products/:productId/milestones/:milestoneId" to="/products/:productId/milestones/:milestoneId/issues" push={false}/>
                <Route path="/products/:productId/milestones" component={ProductMilestoneView}/>
                
                <Route path="/products/:productId/issues/:issueId/comments" component={ProductIssueCommentView}/>
                <Route path="/products/:productId/issues/:issueId/settings" component={ProductIssueSettingView}/>
                <Redirect path="/products/:productId/issues/:issueId" to="/products/:productId/issues/:issueId/comments" push={false}/>
                <Route path="/products/:productId/issues" component={ProductIssueView}/>

                <Route path="/products/:productId/versions/:versionId/merge" component={ProductVersionMergeView}/>
                <Route path="/products/:productId/versions/:versionId/editor" component={ProductVersionEditorView}/>
                <Route path="/products/:productId/versions/:versionId/settings" component={ProductVersionSettingView}/>
                <Redirect path="/products/:productId/versions/:versionId" to="/products/:productId/versions/:versionId/settings" push={false}/>
                <Route path="/products/:productId/versions" component={ProductVersionView}/>
                <Redirect path="/products/:productId" to="/products/:productId/versions" push={false}/>
            </Switch>
        </>
    )
}

export default ProductRouter
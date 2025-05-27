import { nanoid } from "nanoid"
import { MigrationInterface, QueryRunner, TableColumn } from "typeorm"

export class IssueClean1699620641420 implements MigrationInterface {

    private readonly QUERY = "insert into comment_entity (userId, productId, issueId, commentId, audioId, created, updated, deleted, text, action) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Convert issues to comments
        const issues = await queryRunner.query("select * from issue_entity")

        for (const issue of issues) {
            const userId = issue.userId
            const productId = issue.productId
            const issueId = issue.issueId
            const commentId = nanoid()
            const audioId: string = null
            const created = issue.created
            const updated = issue.updated
            const deleted = issue.deleted
            const text = issue.text || ''
            const action = "none"

            const parameters = [userId, productId, issueId, commentId, audioId, created, updated, deleted, text, action]

            await queryRunner.query(this.QUERY, parameters)
        }

        // Drop columns
        await queryRunner.dropColumn("issue_entity", "text")
        await queryRunner.dropColumn("issue_entity", "audioId")
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Add columns
        await queryRunner.addColumn("issue_entity", new TableColumn({ name: "text", type: "text", isNullable: true }))
        await queryRunner.addColumn("issue_entity", new TableColumn({ name: "audioId", type: "text", isNullable: true }))
    }

}

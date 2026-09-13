import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLockToSequence1789319648965 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION set_message_sequence_number()
            RETURNS TRIGGER AS $$
            BEGIN
                -- Acquire an advisory lock bound to the current transaction for this conversation.
                -- This queues concurrent inserts for the same conversation without locking other conversations.
                PERFORM pg_advisory_xact_lock(hashtext(NEW.conversation_id::text));

                SELECT COALESCE(MAX(sequence_number), 0) + 1
                INTO NEW.sequence_number
                FROM public.messages
                WHERE conversation_id = NEW.conversation_id;

                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert back to the original function without the advisory lock
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION set_message_sequence_number()
            RETURNS TRIGGER AS $$
            BEGIN
                SELECT COALESCE(MAX(sequence_number), 0) + 1
                INTO NEW.sequence_number
                FROM public.messages
                WHERE conversation_id = NEW.conversation_id;

                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);
    }

}

import { MigrationInterface, QueryRunner } from "typeorm";

export class AddVectorAndTrigger1781956223962 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Enable the pgvector extension
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector;`);

        // 2. Drop existing triggers if they exist
        await queryRunner.query(`DROP TRIGGER IF EXISTS trg_messages_sequence_number ON public.messages;`);
        await queryRunner.query(`DROP TRIGGER IF EXISTS trg_set_message_sequence_number ON public.messages;`);

        // 3. Create or replace the sequence function
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

        // 4. Create the trigger
        await queryRunner.query(`
            CREATE TRIGGER trg_set_message_sequence_number
            BEFORE INSERT ON public.messages
            FOR EACH ROW
            EXECUTE FUNCTION set_message_sequence_number();
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Rollback strategy: Drop the trigger and function, but keep the extension 
        // (unless you are absolutely sure you want to drop the vector extension entirely)
        await queryRunner.query(`DROP TRIGGER IF EXISTS trg_set_message_sequence_number ON public.messages;`);
        await queryRunner.query(`DROP FUNCTION IF EXISTS set_message_sequence_number();`);
    }

}

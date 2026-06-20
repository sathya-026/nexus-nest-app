import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialMigration1781956081165 implements MigrationInterface {
    name = 'InitialMigration1781956081165'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "organizations" ("id" uuid NOT NULL, "name" character varying(255) NOT NULL, "api_key" character varying(255) NOT NULL, "plan" character varying(50) NOT NULL DEFAULT 'free', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_d9f1fa2dd1b9943f596decf292f" UNIQUE ("api_key"), CONSTRAINT "PK_6b031fcd0863e3f6b44230163f9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL, "org_id" uuid NOT NULL, "email" character varying(255) NOT NULL, "password_hash" character varying(255) NOT NULL, "role" character varying(50) NOT NULL DEFAULT 'member', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "agents" ("id" uuid NOT NULL, "org_id" uuid NOT NULL, "name" character varying(255) NOT NULL, "system_prompt" text NOT NULL, "widget_config" jsonb NOT NULL DEFAULT '{}', "access_type" character varying NOT NULL DEFAULT 'public', "allowed_domains" text, "llm_provider" character varying(50) NOT NULL DEFAULT 'openai', "llm_model" character varying(255) NOT NULL DEFAULT 'gpt-4o-mini', "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_9c653f28ae19c5884d5baf6a1d9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "tools" ("id" BIGSERIAL NOT NULL, "agent_id" uuid NOT NULL, "name" character varying(255) NOT NULL, "description" text NOT NULL, "type" character varying(50) NOT NULL DEFAULT 'http', "endpoint_url" character varying(2048) NOT NULL, "http_method" character varying(10) NOT NULL DEFAULT 'POST', "headers" jsonb, "parameters_schema" jsonb, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_e23d56734caad471277bad8bf85" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "user_agent_access" ("user_id" uuid NOT NULL, "agent_id" uuid NOT NULL, "granted_by" character varying NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_8bdba1e7befa412a14e2c2e1105" PRIMARY KEY ("user_id", "agent_id"))`);
        await queryRunner.query(`CREATE TABLE "org_invitations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "org_id" uuid NOT NULL, "email" character varying(255) NOT NULL, "role" character varying(10) NOT NULL, "token_hash" character varying(255) NOT NULL, "invited_by" uuid NOT NULL, "agent_restrictions" jsonb, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "accepted_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "uq_org_invitations_org_email" UNIQUE ("org_id", "email"), CONSTRAINT "PK_816479c04d050bf432016a5007d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "documents" ("id" uuid NOT NULL, "agent_id" uuid NOT NULL, "name" character varying(255) NOT NULL, "file_type" character varying(50) NOT NULL, "s3_key" character varying(1024) NOT NULL, "status" character varying(50) NOT NULL DEFAULT 'pending', "description" text NOT NULL DEFAULT '', "chunk_count" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_ac51aa5181ee2036f5ca482857c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "conversations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "agent_id" uuid NOT NULL, "session_id" character varying(255) NOT NULL, "end_user_id" character varying(255), "total_tokens" integer NOT NULL DEFAULT '0', "message_count" integer NOT NULL DEFAULT '0', "status" character varying(50) NOT NULL DEFAULT 'active', "started_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "last_message_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_285e84ab2537d6af999be71aa55" UNIQUE ("session_id"), CONSTRAINT "PK_ee34f4f7ced4ec8681f26bf04ef" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "messages" ("id" BIGSERIAL NOT NULL, "conversation_id" uuid NOT NULL, "sequence_number" integer NOT NULL, "role" character varying(50) NOT NULL, "content" text NOT NULL, "tokens_used" integer, "latency_ms" integer, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_2b099f74ae5a65139b3763b3529" UNIQUE ("conversation_id", "sequence_number"), CONSTRAINT "PK_18325f38ae6de43878487eff986" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_2b099f74ae5a65139b3763b352" ON "messages" ("conversation_id", "sequence_number") `);
        await queryRunner.query(`CREATE TABLE "tool_calls" ("id" BIGSERIAL NOT NULL, "message_id" bigint NOT NULL, "tool_id" bigint NOT NULL, "input" jsonb, "output" jsonb, "status" character varying(50) NOT NULL DEFAULT 'success', "latency_ms" integer, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_08984f8a6bc13859241462df855" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "document_chunks" ("id" BIGSERIAL NOT NULL, "document_id" uuid NOT NULL, "agent_id" uuid NOT NULL, "content" text NOT NULL, "embedding" vector(1536) NOT NULL, "chunk_index" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_7f9060084e9b872dbb567193978" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_ae9a997fdf3aa6507895a1aa6f" ON "document_chunks" ("agent_id") `);
        await queryRunner.query(`CREATE TABLE "analytics_events" ("id" BIGSERIAL NOT NULL, "org_id" uuid NOT NULL, "agent_id" uuid NOT NULL, "event_type" character varying(100) NOT NULL, "payload" jsonb NOT NULL DEFAULT '{}', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "conversation_id" uuid, CONSTRAINT "PK_5d643d67a09b55653e98616f421" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_03792118ca496b1c1dc3a9b807" ON "analytics_events" ("agent_id", "event_type") `);
        await queryRunner.query(`CREATE INDEX "IDX_db4dd0e68f96513c624de76eda" ON "analytics_events" ("org_id", "created_at") `);
        await queryRunner.query(`CREATE TABLE "widget_otp_codes" ("id" BIGSERIAL NOT NULL, "agent_id" uuid NOT NULL, "email" character varying(255) NOT NULL, "code_hash" character varying(255) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "used_at" TIMESTAMP WITH TIME ZONE, "attempts" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_4bc13f8f9c61dba619811ffb819" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "widget_auth_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "agent_id" uuid NOT NULL, "email" character varying(255) NOT NULL, "token_hash" character varying(255) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "revoked_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_cfd3e9c4c920f829e95cc952f1e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_0a13270cd3101fd16b8000e00d4" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "agents" ADD CONSTRAINT "FK_2187d33767c1527adf0f62f8c8f" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tools" ADD CONSTRAINT "FK_35c67d65ff68f53daf154d862db" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_agent_access" ADD CONSTRAINT "FK_57a07f07a5178f2f6989d940533" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_agent_access" ADD CONSTRAINT "FK_4dfceb4e397c93681f46cdc00f5" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "org_invitations" ADD CONSTRAINT "FK_f8b8fa9c8398fe6f397d0e78cbe" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "org_invitations" ADD CONSTRAINT "FK_4290ad5c06444b2b4d9c99eb14f" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "documents" ADD CONSTRAINT "FK_778dcd1b4c55179247170ae519f" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "conversations" ADD CONSTRAINT "FK_9f32ead8384a1a92e073a7c006a" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "messages" ADD CONSTRAINT "FK_3bc55a7c3f9ed54b520bb5cfe23" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tool_calls" ADD CONSTRAINT "FK_1e58941738e182541127b35f30b" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tool_calls" ADD CONSTRAINT "FK_6b919572e72dacc7a2d9b5cbcc5" FOREIGN KEY ("tool_id") REFERENCES "tools"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "document_chunks" ADD CONSTRAINT "FK_b371ff8bc1e4f65fc3d01420be5" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "document_chunks" ADD CONSTRAINT "FK_ae9a997fdf3aa6507895a1aa6fe" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "analytics_events" ADD CONSTRAINT "FK_6915b75a34951a6f2780f618804" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "analytics_events" ADD CONSTRAINT "FK_f7fdfff7e299d4a8fd50f824cca" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "analytics_events" ADD CONSTRAINT "FK_5306c8a12bb532105ac7b426151" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "widget_otp_codes" ADD CONSTRAINT "FK_734731920e8f8a3d3ef8c95f73f" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "widget_auth_tokens" ADD CONSTRAINT "FK_a6daf0bc60ddcfd2fdb9c1a789e" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "widget_auth_tokens" DROP CONSTRAINT "FK_a6daf0bc60ddcfd2fdb9c1a789e"`);
        await queryRunner.query(`ALTER TABLE "widget_otp_codes" DROP CONSTRAINT "FK_734731920e8f8a3d3ef8c95f73f"`);
        await queryRunner.query(`ALTER TABLE "analytics_events" DROP CONSTRAINT "FK_5306c8a12bb532105ac7b426151"`);
        await queryRunner.query(`ALTER TABLE "analytics_events" DROP CONSTRAINT "FK_f7fdfff7e299d4a8fd50f824cca"`);
        await queryRunner.query(`ALTER TABLE "analytics_events" DROP CONSTRAINT "FK_6915b75a34951a6f2780f618804"`);
        await queryRunner.query(`ALTER TABLE "document_chunks" DROP CONSTRAINT "FK_ae9a997fdf3aa6507895a1aa6fe"`);
        await queryRunner.query(`ALTER TABLE "document_chunks" DROP CONSTRAINT "FK_b371ff8bc1e4f65fc3d01420be5"`);
        await queryRunner.query(`ALTER TABLE "tool_calls" DROP CONSTRAINT "FK_6b919572e72dacc7a2d9b5cbcc5"`);
        await queryRunner.query(`ALTER TABLE "tool_calls" DROP CONSTRAINT "FK_1e58941738e182541127b35f30b"`);
        await queryRunner.query(`ALTER TABLE "messages" DROP CONSTRAINT "FK_3bc55a7c3f9ed54b520bb5cfe23"`);
        await queryRunner.query(`ALTER TABLE "conversations" DROP CONSTRAINT "FK_9f32ead8384a1a92e073a7c006a"`);
        await queryRunner.query(`ALTER TABLE "documents" DROP CONSTRAINT "FK_778dcd1b4c55179247170ae519f"`);
        await queryRunner.query(`ALTER TABLE "org_invitations" DROP CONSTRAINT "FK_4290ad5c06444b2b4d9c99eb14f"`);
        await queryRunner.query(`ALTER TABLE "org_invitations" DROP CONSTRAINT "FK_f8b8fa9c8398fe6f397d0e78cbe"`);
        await queryRunner.query(`ALTER TABLE "user_agent_access" DROP CONSTRAINT "FK_4dfceb4e397c93681f46cdc00f5"`);
        await queryRunner.query(`ALTER TABLE "user_agent_access" DROP CONSTRAINT "FK_57a07f07a5178f2f6989d940533"`);
        await queryRunner.query(`ALTER TABLE "tools" DROP CONSTRAINT "FK_35c67d65ff68f53daf154d862db"`);
        await queryRunner.query(`ALTER TABLE "agents" DROP CONSTRAINT "FK_2187d33767c1527adf0f62f8c8f"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_0a13270cd3101fd16b8000e00d4"`);
        await queryRunner.query(`DROP TABLE "widget_auth_tokens"`);
        await queryRunner.query(`DROP TABLE "widget_otp_codes"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_db4dd0e68f96513c624de76eda"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_03792118ca496b1c1dc3a9b807"`);
        await queryRunner.query(`DROP TABLE "analytics_events"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ae9a997fdf3aa6507895a1aa6f"`);
        await queryRunner.query(`DROP TABLE "document_chunks"`);
        await queryRunner.query(`DROP TABLE "tool_calls"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2b099f74ae5a65139b3763b352"`);
        await queryRunner.query(`DROP TABLE "messages"`);
        await queryRunner.query(`DROP TABLE "conversations"`);
        await queryRunner.query(`DROP TABLE "documents"`);
        await queryRunner.query(`DROP TABLE "org_invitations"`);
        await queryRunner.query(`DROP TABLE "user_agent_access"`);
        await queryRunner.query(`DROP TABLE "tools"`);
        await queryRunner.query(`DROP TABLE "agents"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TABLE "organizations"`);
    }

}

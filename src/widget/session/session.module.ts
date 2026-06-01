import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionController } from './session.controller';
import { SessionService } from './session.service';
import { Agent } from '@modules/agents/entities/agent.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
    imports: [
        TypeOrmModule.forFeature([Agent]),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                secret: config.get<string>('jwt.sessionSecret'),
                signOptions: { expiresIn: config.get<string>('jwt.sessionExpiresIn') },
            }),
        }),
    ],
    controllers: [SessionController],
    providers: [SessionService],
})
export class WidgetSessionModule { }
import { Controller, Post, Body, Headers } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SessionService, } from './session.service';
import { CreateSessionDto } from './dto/create-session.dto';

@Controller('widget')
export class SessionController {
  constructor(private readonly service: SessionService) {}

  @Post('session')
  @Throttle({ default: { limit: 10, ttl: 60_000 } }) // 10 req/min per IP
  createSession(
    @Body() dto: CreateSessionDto,
    @Headers('origin') origin: string,
    @Headers('referer') referer: string,
  ) {
    // origin is set by browsers for cross-origin fetches; referer as fallback
    return this.service.createSession(dto, origin ?? referer);
  }
}
import {
  Controller, Post, Get, Body,
  Query, Res, HttpCode, HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { InvitationsService }      from './invitations.service';
import { SendInviteDto, AcceptInviteDto } from './dto/index';
import { Public, CurrentUser }     from '../common/decorators/index';
import { AuthUser }                from '../auth/interfaces/jwt-payload.interface';
import { Roles } from '@common/decorators/roles.decorator';
import { Role } from '@common/enums/role.enum';

@Controller('invitations')
export class InvitationsController {
  constructor(private invitationsService: InvitationsService) {}

  // POST /invitations — owner or admin sends invite
  @Post()
  @Roles(Role.Admin, Role.Owner)
  @HttpCode(HttpStatus.OK)
  send(@Body() dto: SendInviteDto, @CurrentUser() user: AuthUser) {
    return this.invitationsService.send(dto, user);
  }

  // GET /invitations/validate?token=xxx — public
  // Frontend calls this on mount of InviteAccept page to check token before rendering the form
  @Public()
  @Get('validate')
  validate(@Query('token') token: string) {
    return this.invitationsService.validate(token);
  }

  // POST /invitations/accept — public
  // User submits the accept form (password setup)
  @Public()
  @Post('accept')
  @HttpCode(HttpStatus.OK)
  accept(
    @Body() dto: AcceptInviteDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.invitationsService.accept(dto, res);
  }
}
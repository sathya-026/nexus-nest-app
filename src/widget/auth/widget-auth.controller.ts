import { Public } from '@common/decorators';
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { WidgetAuthService } from './widget-auth.service';

@Public()
@Controller('widget/auth')
export class WidgetAuthController {
  constructor(private widgetAuthService: WidgetAuthService) { }

  @Post('request-otp')
  @HttpCode(HttpStatus.OK)
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.widgetAuthService.requestOtp(dto);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.widgetAuthService.verifyOtp(dto);
  }
}
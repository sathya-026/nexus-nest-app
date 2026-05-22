import {
    Controller,
    Get,
    Post,
    Delete,
    Body,
    Param,
    UseGuards,
  } from '@nestjs/common';
  import { AddDto } from './dto/add.dto';
  import { SubtractDto } from './dto/subtract.dto';


@Controller('test')
export class TestController {

    @Post('add')
    addNumbers(@Body() dto: AddDto) {
        return dto.list.reduce((acc, cur) => acc + cur, 0);
    }

    @Post('subtract')
    subtractNumbers(@Body() dto: SubtractDto) {
        return dto.a - dto.b;
    }
}

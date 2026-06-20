import { Public } from "@common/decorators";
import { Controller, Get } from "@nestjs/common";

@Controller()
export class AppController {

    @Public()
    @Get('health')
    getHealth(): { status: string } {
        return { status: 'OK' };
    }
}
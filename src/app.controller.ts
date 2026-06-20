import { Public } from "@common/decorators";
import { Controller, Get, Req } from "@nestjs/common";
import { Request } from "express";

@Controller()
export class AppController {

    @Public()
    @Get('health')
    getHealth(): { status: string } {
        return { status: 'OK' };
    }

    @Get('debug-auth')
    debug(@Req() req: Request) {
        console.log(req.cookies);
        console.log(req.headers.cookie);

        return {
            cookies: req.cookies,
            cookieHeader: req.headers.cookie,
        };
    }
}
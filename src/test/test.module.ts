import { Module } from "@nestjs/common";
import { TestController } from "./test.controller";
import { WeatherService } from "./weather.service";

@Module({
  controllers: [TestController],
  providers: [WeatherService],
})
export class TestModule {}

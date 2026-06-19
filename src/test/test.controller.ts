import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AddDto } from "./dto/add.dto";
import { SubtractDto } from "./dto/subtract.dto";
import { WeatherService } from "./weather.service";

@ApiTags("Test")
@ApiBearerAuth()
@Controller("test")
export class TestController {
  constructor(private weatherService: WeatherService) {}
  @Post("add")
  addNumbers(@Body() dto: AddDto) {
    return dto.list.reduce((acc, cur) => acc + cur, 0);
  }

  @Post("subtract")
  subtractNumbers(@Body() dto: SubtractDto) {
    return dto.a - dto.b;
  }

  @Get("current")
  getCurrent(@Query("lat") lat: string, @Query("lon") lon: string) {
    return this.weatherService.getCurrentWeather({
      latitude: Number(lat),
      longitude: Number(lon),
    });
  }

  @Get("forecast")
  getForecast(@Query("lat") lat: string, @Query("lon") lon: string) {
    return this.weatherService.getDailyForecast({
      latitude: Number(lat),
      longitude: Number(lon),
    });
  }
}

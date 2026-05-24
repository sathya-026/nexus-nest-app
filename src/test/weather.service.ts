import { Injectable } from "@nestjs/common";

export interface GetWeatherParams {
  latitude: number;
  longitude: number;
  timezone?: string;
}

@Injectable()
export class WeatherService {
  constructor() {}

  private readonly baseUrl = "https://api.open-meteo.com/v1/forecast";

  async getCurrentWeather(params: GetWeatherParams) {
    const { latitude, longitude, timezone = "auto" } = params;

    const url = `${this.baseUrl}?latitude=${latitude}&longitude=${longitude}&current_weather=true&timezone=${timezone}`;

    const response = await fetch(url);

    return await response.json();
  }

  async getDailyForecast(params: GetWeatherParams) {
    const { latitude, longitude, timezone = "auto" } = params;

    const url = `${this.baseUrl}?latitude=${latitude}&longitude=${
      longitude
    }&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=${timezone}`;

    const response = await fetch(url);

    return await response.json();
  }
}

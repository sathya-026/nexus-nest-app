import { ApiProperty } from "@nestjs/swagger";
import { IsNumber } from "class-validator";

export class SubtractDto {
  @ApiProperty()
  @IsNumber()
  a: number;

  @ApiProperty()
  @IsNumber()
  b: number;
}

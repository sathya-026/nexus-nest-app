import { ApiProperty } from "@nestjs/swagger";
import { IsArray } from "class-validator";

export class AddDto {
  @ApiProperty({
    type: [Number],
    example: [1, 2, 3, 4],
    description: "List of numbers",
  })
  @IsArray()
  list: number[];
}

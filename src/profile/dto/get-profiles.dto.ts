import {
  IsOptional,
  IsString,
  IsNumber,
  IsIn,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GetProfilesDto {
  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  age_group?: string;

  @IsOptional()
  @IsString()
  country_id?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  min_age?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  max_age?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  @Type(() => Number)
  min_gender_probability?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  @Type(() => Number)
  min_country_probability?: number;

  @IsOptional()
  @IsIn(['age', 'created_at', 'gender_probability'])
  sort_by?: string = 'created_at';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: string = 'desc';

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit?: number = 10;
}

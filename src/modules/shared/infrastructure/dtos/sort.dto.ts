import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { SortDirection } from '../../domain/repositories/repository.interface';
import { ValidationMessages } from './validation-messages';

const SORT_ORDERS: SortDirection[] = ['ASC', 'DESC'];

export class SortDto {
  @ApiPropertyOptional({ example: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ example: 'DESC', enum: SORT_ORDERS, default: 'DESC' })
  @IsOptional()
  @IsIn(SORT_ORDERS, { message: ValidationMessages.isIn(SORT_ORDERS) })
  sortOrder?: SortDirection = 'DESC';
}

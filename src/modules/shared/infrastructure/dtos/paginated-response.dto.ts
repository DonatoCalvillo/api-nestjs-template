import { ApiProperty } from '@nestjs/swagger';

export class PaginatedResponseDto<T> {
  @ApiProperty({ isArray: true })
  items: T[];

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  perPage: number;

  @ApiProperty({ example: 5 })
  totalPages: number;
}

export const toPaginatedResponse = <T>(
  items: T[],
  total: number,
  page: number,
  perPage: number,
): PaginatedResponseDto<T> => ({
  items,
  total,
  page,
  perPage,
  totalPages: perPage > 0 ? Math.ceil(total / perPage) : 0,
});

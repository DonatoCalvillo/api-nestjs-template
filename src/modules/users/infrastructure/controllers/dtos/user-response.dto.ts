import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CurrentUserProfile } from '../../../application/use-cases/get-current-user.use-case';
import { User } from '../../../domain/models/user.model';

export class UserResponseDto {
  @ApiProperty({ example: '3f2504e0-4f89-11d3-9a0c-0305e82c3301' })
  id: string;

  @ApiProperty({ example: 'Jane Doe' })
  name: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiPropertyOptional({ example: ['user'], type: [String] })
  roles?: string[];

  @ApiPropertyOptional({ example: [], type: [String] })
  permissions?: string[];

  @ApiPropertyOptional({ example: '2024-01-01T00:00:00.000Z' })
  createdAt?: Date | null;

  @ApiPropertyOptional({ example: '2024-01-02T00:00:00.000Z' })
  updatedAt?: Date | null;

  @ApiPropertyOptional({ example: 1 })
  version?: number | null;
}

export const toUserResponseDto = (user: User): UserResponseDto => ({
  id: user.id,
  name: user.name,
  email: user.email,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
  version: user.version,
});

export const toUserProfileResponseDto = (
  profile: CurrentUserProfile,
): UserResponseDto => ({
  id: profile.id,
  name: profile.name,
  email: profile.email,
  roles: profile.roles,
  permissions: profile.permissions,
  createdAt: profile.createdAt,
  updatedAt: profile.updatedAt,
  version: profile.version,
});

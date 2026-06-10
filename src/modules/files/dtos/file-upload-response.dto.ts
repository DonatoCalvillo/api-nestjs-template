import { ApiProperty } from '@nestjs/swagger';

export class FileUploadResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890-document.pdf' })
  key: string;

  @ApiProperty({
    example: 'http://localhost:9000/uploads/a1b2c3d4-document.pdf',
  })
  url: string;
}

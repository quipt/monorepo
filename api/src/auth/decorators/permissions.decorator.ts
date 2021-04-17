import { SetMetadata } from '@nestjs/common';

// tslint:disable-next-line:variable-name
export const Permissions = (...permissions: string[]) =>
  SetMetadata('permissions', permissions);

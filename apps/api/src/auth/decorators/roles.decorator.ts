import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '@fono/shared';

export const ROLES_KEY = 'fono:auth:roles';

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

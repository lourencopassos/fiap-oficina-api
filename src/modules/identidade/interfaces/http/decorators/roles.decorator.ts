import { SetMetadata } from '@nestjs/common';
import { Role } from '../../../domain/role';

export const ROLES_KEY = 'roles';

/** Restringe a rota aos perfis informados. ADMIN sempre tem acesso. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsuarioAutenticado } from '../../../application/portas';
import { Role } from '../../../domain/role';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const exigidas = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!exigidas?.length) return true;

    const usuario = context.switchToHttp().getRequest<{ usuario?: UsuarioAutenticado }>().usuario;
    if (usuario && (usuario.role === Role.ADMIN || exigidas.includes(usuario.role))) return true;
    throw new ForbiddenException('Perfil sem permissão para esta operação');
  }
}

import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { ActorContextService } from '../../../shared/infrastructure/audit/actor-context.service';
import { IS_PUBLIC_KEY } from '../constants/auth-metadata.constants';
import { isPublicPath } from '../constants/public-paths';
import { AuthenticatedUser } from '../../../users/application/types/authenticated-user';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    private readonly actorContext: ActorContextService,
  ) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      method?: string;
      path?: string;
    }>();

    if (
      request.method &&
      request.path &&
      isPublicPath(request.method, request.path)
    ) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest<TUser = AuthenticatedUser>(
    err: Error | null,
    user: TUser | false,
  ): TUser {
    if (err || !user) {
      throw err ?? new UnauthorizedException();
    }

    const authenticatedUser = user as unknown as AuthenticatedUser;
    this.actorContext.setActor({
      actorId: authenticatedUser.id,
      actorType: 'user',
      displayName: authenticatedUser.email,
    });

    return user;
  }
}

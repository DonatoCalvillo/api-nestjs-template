import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ENVIRONMENT_VARIABLES } from '../../../../configuration/environments-variables';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../../users/application/ports/user.repository.port';
import { AccessTokenPayload } from '../services/token.service';
import { AuthenticatedUser } from '../../../users/application/types/authenticated-user';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: ENVIRONMENT_VARIABLES.JWT_ACCESS_SECRET,
    });
  }

  async validate(payload: AccessTokenPayload): Promise<AuthenticatedUser> {
    const user = await this.userRepository.findByIdWithRolesAndPermissions(
      payload.sub,
    );

    if (!user) {
      throw new UnauthorizedException();
    }

    return user;
  }
}

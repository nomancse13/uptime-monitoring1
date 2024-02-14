import { ExecutionContext, Injectable } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common/exceptions';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { decrypt } from 'src/helper/crypto.helper';
import { ErrorMessage, UserTypesEnum } from 'src/monitrix-auth/common/enum';
import { IS_PUBLIC_KEY } from 'src/monitrix-auth/utils/decorators';

@Injectable()
export class AtGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
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
    return super.canActivate(context);
  }

  // handle request
  handleRequest(err: any, user: any) {
    // You can throw an exception based on either "info" or "err" arguments
    if (err || !user) {
      throw new UnauthorizedException(ErrorMessage.UNAUTHORIZED);
    }
    if (decrypt(user.hashType) === UserTypesEnum.ADMIN) {
      throw new UnauthorizedException(ErrorMessage.UNAUTHORIZED);
    }
    return user;
  }
}

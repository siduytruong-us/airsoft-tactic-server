import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/**
 * Extract current user từ JWT-decoded request.
 * Usage: @CurrentUser() user: RequestUser
 *        @CurrentUser('userId') userId: string
 */
export interface RequestUser {
  userId: string;
  email?: string;
  role: string;
}

export const CurrentUser = createParamDecorator(
  (field: keyof RequestUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.user as RequestUser | undefined;
    return field ? user?.[field] : user;
  },
);

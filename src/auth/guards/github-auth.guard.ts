import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GithubAuthGuard extends AuthGuard('github') {
  handleRequest<TUser = unknown>(
    err: unknown,
    user: unknown,
    info: unknown,
  ): TUser {
    if (err) {
      const oauthError = (
        err as { oauthError?: { data?: unknown; statusCode?: number } }
      ).oauthError;

      let details = '';
      if (typeof oauthError?.data === 'string') {
        details = oauthError.data;
      } else if (oauthError?.data) {
        try {
          details = JSON.stringify(oauthError.data);
        } catch {
          details = '';
        }
      }

      const message =
        details.trim().length > 0
          ? `GitHub OAuth token exchange failed: ${details}`
          : (err as Error).message || 'GitHub authentication failed';

      throw new UnauthorizedException(message);
    }

    if (!user) {
      const infoMessage =
        typeof info === 'object' &&
        info !== null &&
        'message' in (info as Record<string, unknown>)
          ? (info as Record<string, unknown>).message
          : undefined;
      throw new UnauthorizedException(
        typeof infoMessage === 'string'
          ? infoMessage
          : 'GitHub authentication failed',
      );
    }

    return user as TUser;
  }
}

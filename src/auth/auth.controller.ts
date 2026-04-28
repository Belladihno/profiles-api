import {
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { GithubAuthGuard } from './guards/github-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import type { Request, Response } from 'express';
import { User } from './entities/user.entity';

interface AuthenticatedUser {
  userId: string;
  role: string;
  isActive: boolean;
}

interface RequestWithUser extends Request {
  user: AuthenticatedUser;
  cookies: {
    refreshToken?: string;
  };
  body: {
    refresh_token?: string;
  };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('github')
  @UseGuards(GithubAuthGuard)
  login() {}

  @Get('github/callback')
  @UseGuards(GithubAuthGuard)
  async callback(
    @Req() req: RequestWithUser & { user: User },
    @Res() res: Response,
  ) {
    const tokens = await this.authService.generateTokens(req.user);

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    return res.json({
      access_token: tokens.accessToken,
      user: req.user,
    });
  }

  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  @HttpCode(200)
  async refresh(@Req() req: RequestWithUser, @Res() res: Response) {
    const refreshToken = req.body.refresh_token ?? req.cookies.refreshToken;

    if (!refreshToken) {
      throw new Error('No refresh token provided');
    }

    const tokens = await this.authService.refreshTokens(
      refreshToken,
      req.user.userId,
    );

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    return res.json({
      status: 'success',
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    });
  }

  @Post('logout')
  @UseGuards(JwtRefreshGuard)
  @HttpCode(204)
  async logout(@Req() req: RequestWithUser, @Res() res: Response) {
    await this.authService.logout(req.user.userId);
    res.clearCookie('refreshToken');
    return res.status(HttpStatus.NO_CONTENT).send();
  }
}

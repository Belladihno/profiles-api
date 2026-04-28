import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { StrategyOptions } from 'passport-github2';
import { Strategy } from 'passport-github2';
import { AuthService } from '../auth.service';
import { User } from '../entities/user.entity';
import { GitHubProfile } from 'src/profile/interface/internal.interface';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(private readonly authService: AuthService) {
    const clientID = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    const baseUrl = process.env.BASE_URL;

    if (!clientID) {
      throw new Error('GITHUB_CLIENT_ID is not defined');
    }

    if (!clientSecret) {
      throw new Error('GITHUB_CLIENT_SECRET is not defined');
    }

    if (!baseUrl) {
      throw new Error('BASE_URL is not defined');
    }

    const options: StrategyOptions = {
      clientID,
      clientSecret,
      callbackURL: `${baseUrl}/auth/github/callback`,
      scope: ['user:email'],
      pkce: true,
      state: 'true',
      passReqToCallback: false,
    };
    super(options);
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: (error: any, user?: User | null) => void,
  ) {
    try {
      const user = await this.authService.validateUser(
        profile as GitHubProfile,
      );
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  }
}

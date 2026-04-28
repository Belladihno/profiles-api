import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v7 as uuidv7 } from 'uuid';
import { User } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { GitHubProfile } from 'src/profile/interface/internal.interface';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshRepo: Repository<RefreshToken>,
    private jwtService: JwtService,
  ) {}

  async validateUser(githubProfile: GitHubProfile): Promise<User> {
    let user = await this.userRepo.findOne({
      where: { githubId: githubProfile.id },
    });
    const now = new Date();
    if (user) {
      user.username = githubProfile.username || user.username;
      user.email = githubProfile.emails?.[0]?.value || user.email;
      user.avatarUrl = githubProfile.photos?.[0]?.value || user.avatarUrl;
      user.lastLoginAt = now;
      await this.userRepo.save(user);
    } else {
      user = this.userRepo.create({
        githubId: githubProfile.id,
        username: githubProfile.username,
        email: githubProfile.emails?.[0]?.value,
        avatarUrl: githubProfile.photos?.[0]?.value,
        role: 'analyst',
        isActive: true,
        lastLoginAt: now,
      });
      await this.userRepo.save(user);
    }
    return user;
  }

  async generateTokens(
    user: User,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = this.jwtService.sign(
      { userId: user.id, role: user.role, isActive: user.isActive },
      { expiresIn: '3m' },
    );

    const refreshToken = this.jwtService.sign(
      { userId: user.id },
      { expiresIn: '5m' },
    );

    const hashedRefresh = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Keep a single active refresh token per user to avoid stale-row mismatches.
    await this.refreshRepo.delete({ userId: user.id });

    const refreshEntry = this.refreshRepo.create({
      id: uuidv7(),
      token: hashedRefresh,
      userId: user.id,
      expiresAt,
    });

    await this.refreshRepo.save(refreshEntry);

    return { accessToken, refreshToken };
  }

  async validateRefreshToken(token: string, userId: string): Promise<boolean> {
    const refreshEntries = await this.refreshRepo.find({
      where: { userId },
      order: { expiresAt: 'DESC' },
    });

    if (refreshEntries.length === 0) return false;

    const now = new Date();
    for (const entry of refreshEntries) {
      if (now > entry.expiresAt) continue;
      if (await bcrypt.compare(token, entry.token)) return true;
    }

    return false;
  }

  async refreshTokens(
    oldRefreshToken: string,
    userId: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    await this.refreshRepo.delete({ userId });
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Invalid user');
    if (!user.isActive) throw new ForbiddenException('User is inactive');
    return this.generateTokens(user);
  }

  async logout(userId: string): Promise<void> {
    await this.refreshRepo.delete({ userId });
  }
}

import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfilesModule } from './profile/profile.module';
import { Profile } from './profile/entities/profile.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const dbUrl = config.get<string>('DATABASE_URL');
        return {
          type: 'postgres',
          url: dbUrl,
          // ssl: {
          //   rejectUnauthorized: false,
          // },
          entities: [Profile],
          synchronize: true,
          // extra: {
          //   ssl: {
          //     rejectUnauthorized: false,
          //   },
          // },
        };
      },
      inject: [ConfigService],
    }),
    ProfilesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

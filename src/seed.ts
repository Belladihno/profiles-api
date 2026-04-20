import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SeedService } from './profile/seed.service';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const seedService = app.get(SeedService);

  try {
    const result = await seedService.seedProfiles();
    console.log(result.message);
  } catch (error) {
    console.error('Seeding failed:', (error as Error).message);
    process.exit(1);
  }

  await app.close();
}

void seed();

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile } from './entities/profile.entity';
import { v7 as uuidv7 } from 'uuid';
import * as fs from 'fs';
import { SeedResponse } from './interface/internal.interface';

@Injectable()
export class SeedService {
  constructor(
    @InjectRepository(Profile)
    private readonly profileRepo: Repository<Profile>,
  ) {}

  async seedProfiles() {
    try {
      const data = JSON.parse(
        fs.readFileSync('seed_profiles.json', 'utf-8'),
      ) as SeedResponse;
      const profiles = data.profiles;

      let seeded = 0;
      let skipped = 0;

      for (const item of profiles) {
        const existing = await this.profileRepo.findOne({
          where: { name: item.name },
        });

        if (existing) {
          skipped++;
          continue;
        }

        const profile = this.profileRepo.create({
          id: uuidv7(),
          name: item.name,
          gender: item.gender,
          gender_probability: item.gender_probability,
          age: item.age,
          age_group: item.age_group,
          country_id: item.country_id,
          country_name: item.country_name,
          country_probability: item.country_probability,
          created_at: new Date(),
        });

        await this.profileRepo.save(profile);
        seeded++;
      }

      return {
        message: `Seeded ${seeded} profiles, skipped ${skipped} duplicates`,
      };
    } catch (error) {
      throw new Error(`Seeding failed: ${(error as Error).message}`);
    }
  }
}

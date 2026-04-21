import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile } from './entities/profile.entity';
import { v7 as uuidv7 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
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
        fs.readFileSync(
          path.join(process.cwd(), 'seed_profiles.json'),
          'utf-8',
        ),
      ) as SeedResponse;
      const profiles = data.profiles;

      const existingNames = await this.profileRepo
        .createQueryBuilder('profile')
        .select('profile.name')
        .getMany()
        .then((rows) => new Set(rows.map((r) => r.name)));

      const toInsert = profiles.filter((item) => !existingNames.has(item.name));

      if (toInsert.length === 0) {
        return { message: `All profiles already seeded, nothing to insert` };
      }

      const entities = toInsert.map((item) =>
        this.profileRepo.create({
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
        }),
      );

      await this.profileRepo.save(entities, { chunk: 100 });

      return {
        message: `Seeded ${entities.length} profiles, skipped ${profiles.length - entities.length} duplicates`,
      };
    } catch (error) {
      throw new Error(`Seeding failed: ${(error as Error).message}`);
    }
  }
}

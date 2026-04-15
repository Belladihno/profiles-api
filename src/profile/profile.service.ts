import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { CreateProfileDto } from './dto/create-profile.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Profile } from './entities/profile.entity';
import { Repository } from 'typeorm';
import {
  AgifyResponse,
  GenderizeResponse,
  NationalizeResponse,
} from './interface/external-api.interface';

@Injectable()
export class ProfilesService {
  constructor(
    @InjectRepository(Profile)
    private readonly profileRepo: Repository<Profile>,
  ) {}

  private classifyAgeGroup(age: number): string {
    if (age <= 12) return 'child';
    if (age <= 19) return 'teenager';
    if (age <= 59) return 'adult';
    return 'senior';
  }

  async createProfile(dto: CreateProfileDto) {
    const name = dto.name.toLowerCase().trim();

    const existing = await this.profileRepo.findOne({
      where: { name },
    });
    if (existing) {
      return {
        status: 'success',
        message: 'Profile already exists!',
        data: existing,
      };
    }

    let genderData: GenderizeResponse;
    let agifyData: AgifyResponse;
    let nationalizeData: NationalizeResponse;

    try {
      [genderData, agifyData, nationalizeData] = await Promise.all([
        fetch(`https://api.genderize.io?name=${name}`).then(async (r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return (await r.json()) as GenderizeResponse;
        }),
        fetch(`https://api.agify.io?name=${name}`).then(async (r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return (await r.json()) as AgifyResponse;
        }),
        fetch(`https://api.nationalize.io?name=${name}`).then(async (r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return (await r.json()) as NationalizeResponse;
        }),
      ]);
    } catch {
      throw new HttpException(
        { status: 'error', message: 'Failed to reach external API' },
        HttpStatus.BAD_GATEWAY,
      );
    }

    if (!genderData.gender || genderData.count === 0) {
      throw new HttpException(
        {
          status: 'error',
          message: 'Insufficient gender data for this name',
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    if (agifyData.age === null) {
      throw new HttpException(
        {
          status: 'error',
          message: 'Insufficient age data for this name',
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    if (!nationalizeData.country || nationalizeData.country.length === 0) {
      throw new HttpException(
        {
          status: 'error',
          message: 'Insufficient nationality data for this name',
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const topCountry = nationalizeData.country.reduce((a, b) =>
      a.probability >= b.probability ? a : b,
    );

    const profile = this.profileRepo.create({
      name,
      gender: genderData.gender,
      gender_probality: genderData.probability,
      sample_size: genderData.count,
      age: agifyData.age,
      age_group: this.classifyAgeGroup(agifyData.age),
      country_id: topCountry.country_id,
      country_probability: topCountry.probability,
    });

    const saved = await this.profileRepo.save(profile);
    return { status: 'success', data: saved };
  }
}

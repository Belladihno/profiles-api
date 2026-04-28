import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { CreateProfileDto } from './dto/create-profile.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Profile } from './entities/profile.entity';
import { Repository, SelectQueryBuilder } from 'typeorm';
import {
  AgifyResponse,
  GenderizeResponse,
  NationalizeResponse,
} from './interface/external-api.interface';
import { GetProfilesDto } from './dto/get-profiles.dto';

@Injectable()
export class ProfilesService {
  constructor(
    @InjectRepository(Profile)
    private readonly profileRepo: Repository<Profile>,
  ) {}

  private countryMap: Map<string, string> | null = null;

  private async getCountryMap(): Promise<Map<string, string>> {
    if (this.countryMap) return this.countryMap;

    const profiles = await this.profileRepo.find({
      select: ['country_id', 'country_name'],
    });

    this.countryMap = new Map();
    profiles.forEach((p) => this.countryMap!.set(p.country_id, p.country_name));
    return this.countryMap;
  }

  private countryMapReverse: Map<string, string> | null = null;

  private async getCountryMapReverse(): Promise<Map<string, string>> {
    if (this.countryMapReverse) return this.countryMapReverse;

    const profiles = await this.profileRepo.find({
      select: ['country_id', 'country_name'],
    });

    this.countryMapReverse = new Map();
    profiles.forEach((p) =>
      this.countryMapReverse!.set(p.country_name.toLowerCase(), p.country_id),
    );
    return this.countryMapReverse;
  }

  private async parseQuery(q: string): Promise<Partial<GetProfilesDto>> {
    const filters: Partial<GetProfilesDto> = {};
    const words = q.toLowerCase().split(/\s+/);

    // Gender
    if (words.includes('male') || words.includes('males'))
      filters.gender = 'male';
    if (words.includes('female') || words.includes('females'))
      filters.gender = 'female';

    // Age group
    if (words.includes('teenagers')) filters.age_group = 'teenager';
    if (words.includes('adult')) filters.age_group = 'adult';
    if (words.includes('child')) filters.age_group = 'child';
    if (words.includes('senior')) filters.age_group = 'senior';

    // Age ranges
    if (words.includes('young')) {
      filters.min_age = 16;
      filters.max_age = 24;
    }
    const aboveIndex = words.findIndex((w) => w === 'above');
    if (aboveIndex !== -1 && words[aboveIndex + 1]) {
      const age = parseInt(words[aboveIndex + 1]);
      if (!isNaN(age)) filters.min_age = age;
    }

    // Country
    const fromIndex = words.findIndex((w) => w === 'from');
    if (fromIndex !== -1 && words[fromIndex + 1]) {
      const countryName = words
        .slice(fromIndex + 1)
        .join(' ')
        .toLowerCase();
      const countryMapReverse = await this.getCountryMapReverse();
      const id = countryMapReverse.get(countryName);
      if (id) filters.country_id = id;
    }

    return filters;
  }

  private classifyAgeGroup(age: number): string {
    if (age <= 12) return 'child';
    if (age <= 19) return 'teenager';
    if (age <= 59) return 'adult';
    return 'senior';
  }

  private applyFilters(
    qb: SelectQueryBuilder<Profile>,
    query: GetProfilesDto,
  ): void {
    if (query.gender) {
      qb.andWhere('LOWER(p.gender) = LOWER(:gender)', { gender: query.gender });
    }
    if (query.age_group) {
      qb.andWhere('LOWER(p.age_group) = LOWER(:age_group)', {
        age_group: query.age_group,
      });
    }
    if (query.country_id) {
      qb.andWhere('LOWER(p.country_id) = LOWER(:country_id)', {
        country_id: query.country_id,
      });
    }
    if (query.min_age !== undefined) {
      qb.andWhere('p.age >= :min_age', { min_age: query.min_age });
    }
    if (query.max_age !== undefined) {
      qb.andWhere('p.age <= :max_age', { max_age: query.max_age });
    }
    if (query.min_gender_probability !== undefined) {
      qb.andWhere('p.gender_probability >= :min_gender_probability', {
        min_gender_probability: query.min_gender_probability,
      });
    }
    if (query.min_country_probability !== undefined) {
      qb.andWhere('p.country_probability >= :min_country_probability', {
        min_country_probability: query.min_country_probability,
      });
    }
  }

  private applySorting(
    qb: SelectQueryBuilder<Profile>,
    query: GetProfilesDto,
  ): void {
    const sortBy = query.sort_by || 'created_at';
    const order = query.order || 'desc';
    qb.orderBy(`p.${sortBy}`, order.toUpperCase() as 'ASC' | 'DESC');
  }

  private csvEscape(value: unknown): string {
    if (value === null || value === undefined) return '';

    let str: string;
    if (typeof value === 'string') {
      str = value;
    } else if (
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      typeof value === 'bigint'
    ) {
      str = `${value}`;
    } else if (value instanceof Date) {
      str = value.toISOString();
    } else if (typeof value === 'symbol') {
      str = value.toString();
    } else {
      str = JSON.stringify(value);
    }

    if (str.includes('"') || str.includes(',') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  async createProfile(dto: CreateProfileDto) {
    const name = dto.name.toLowerCase().trim();

    const existing = await this.profileRepo.findOne({
      where: { name },
    });
    if (existing) {
      return {
        status: 'success',
        message: 'Profile already exists',
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
          message: 'Genderize returned an invalid response',
        },
        HttpStatus.BAD_GATEWAY,
      );
    }

    if (agifyData.age === null) {
      throw new HttpException(
        {
          status: 'error',
          message: 'Agify returned an invalid response',
        },
        HttpStatus.BAD_GATEWAY,
      );
    }

    if (!nationalizeData.country || nationalizeData.country.length === 0) {
      throw new HttpException(
        {
          status: 'error',
          message: 'Nationalize returned an invalid response',
        },
        HttpStatus.BAD_GATEWAY,
      );
    }

    const topCountry = nationalizeData.country.reduce((a, b) =>
      a.probability >= b.probability ? a : b,
    );

    const countryMap = await this.getCountryMap();
    const profile = this.profileRepo.create({
      name,
      gender: genderData.gender,
      gender_probability: genderData.probability,
      age: agifyData.age,
      age_group: this.classifyAgeGroup(agifyData.age),
      country_id: topCountry.country_id,
      country_name: countryMap.get(topCountry.country_id) || 'Unknown',
      country_probability: topCountry.probability,
    });

    const saved = await this.profileRepo.save(profile);
    return { status: 'success', data: saved };
  }

  async getProfileById(id: string) {
    const profile = await this.profileRepo.findOne({ where: { id } });
    if (!profile) {
      throw new HttpException(
        { status: 'error', message: 'Profile not found' },
        HttpStatus.NOT_FOUND,
      );
    }
    return { status: 'success', data: profile };
  }

  async getAllProfiles(query: GetProfilesDto) {
    const qb = this.profileRepo.createQueryBuilder('p');
    this.applyFilters(qb, query);
    this.applySorting(qb, query);

    const page = query.page || 1;
    const limit = query.limit || 10;
    const offset = (page - 1) * limit;

    qb.skip(offset).take(limit);

    const [profiles, total] = await qb.getManyAndCount();

    const totalPages = Math.ceil(total / limit);
    const links = {
      self: `/api/profiles?page=${page}&limit=${limit}`,
      next:
        page < totalPages
          ? `/api/profiles?page=${page + 1}&limit=${limit}`
          : null,
      prev: page > 1 ? `/api/profiles?page=${page - 1}&limit=${limit}` : null,
    };

    return {
      status: 'success',
      page,
      limit,
      total,
      total_pages: totalPages,
      links,
      data: profiles.map((p) => ({
        id: p.id,
        name: p.name,
        gender: p.gender,
        gender_probability: p.gender_probability,
        age: p.age,
        age_group: p.age_group,
        country_id: p.country_id,
        country_name: p.country_name,
        country_probability: p.country_probability,
        created_at: p.created_at,
      })),
    };
  }

  async searchProfiles(q: string, page?: number, limit?: number) {
    const filters = await this.parseQuery(q);
    if (Object.keys(filters).length === 0) {
      throw new HttpException(
        { status: 'error', message: 'Unable to interpret query' },
        HttpStatus.BAD_REQUEST,
      );
    }
    const dto: GetProfilesDto = {
      ...filters,
      sort_by: 'created_at',
      order: 'desc',
      page: page || 1,
      limit: limit || 10,
    } as GetProfilesDto;
    return this.getAllProfiles(dto);
  }

  async deleteProfile(id: string) {
    const profile = await this.profileRepo.findOne({ where: { id } });
    if (!profile) {
      throw new HttpException(
        { status: 'error', message: 'Profile not found' },
        HttpStatus.NOT_FOUND,
      );
    }
    await this.profileRepo.remove(profile);
  }

  async exportProfiles(query: GetProfilesDto): Promise<string> {
    const qb = this.profileRepo.createQueryBuilder('p');
    this.applyFilters(qb, query);
    this.applySorting(qb, query);

    const profiles = await qb.getMany();
    const header =
      'id,name,gender,gender_probability,age,age_group,country_id,country_name,country_probability,created_at';
    const rows = profiles
      .map((p) =>
        [
          p.id,
          p.name,
          p.gender,
          p.gender_probability,
          p.age,
          p.age_group,
          p.country_id,
          p.country_name,
          p.country_probability,
          p.created_at?.toISOString?.() ?? '',
        ]
          .map((value) => this.csvEscape(value))
          .join(','),
      )
      .join('\n');

    return rows.length > 0 ? `${header}\n${rows}` : `${header}\n`;
  }
}

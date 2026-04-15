import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { ProfilesService } from './profile.service';
import { CreateProfileDto } from './dto/create-profile.dto';

@Controller('api/profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Post()
  async create(@Body() dto: CreateProfileDto) {
    return this.profilesService.createProfile(dto);
  }

  @Get()
  async findAll(
    @Query('gender') gender?: string,
    @Query('country_id') country_id?: string,
    @Query('age_group') age_group?: string,
  ) {
    return this.profilesService.getAllProfiles(gender, country_id, age_group);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.profilesService.getProfileById(id);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.profilesService.deleteProfile(id);
  }
}

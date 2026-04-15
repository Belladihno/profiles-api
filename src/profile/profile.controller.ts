import { Controller, Post, Body } from '@nestjs/common';
import { ProfilesService } from './profile.service';
import { CreateProfileDto } from './dto/create-profile.dto';

@Controller('api/profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Post()
  async create(@Body() dto: CreateProfileDto) {
    return this.profilesService.createProfile(dto);
  }
}

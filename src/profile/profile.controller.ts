import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Delete,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ProfilesService } from './profile.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { GetProfilesDto } from './dto/get-profiles.dto';

@Controller('api/profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Post()
  async create(@Body() dto: CreateProfileDto) {
    return this.profilesService.createProfile(dto);
  }

  @Get()
  async findAll(@Query() query: GetProfilesDto) {
    return this.profilesService.getAllProfiles(query);
  }

  @Get('search')
  async search(
    @Query('q') q: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    if (!q || q.trim() === '') {
      throw new HttpException(
        { status: 'error', message: 'Query parameter q is required' },
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.profilesService.searchProfiles(q, page, limit);
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

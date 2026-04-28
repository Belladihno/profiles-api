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
  UseGuards,
  Res,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ProfilesService } from './profile.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { GetProfilesDto } from './dto/get-profiles.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { Response } from 'express';

@Controller({ path: 'profiles' })
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async create(@Body() dto: CreateProfileDto) {
    return this.profilesService.createProfile(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  async findAll(@Query() query: GetProfilesDto) {
    return this.profilesService.getAllProfiles(query);
  }

  @Get('search')
  @UseGuards(JwtAuthGuard, RolesGuard)
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

  @Get('export')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async export(
    @Res() res: Response,
    @Query() query: GetProfilesDto,
    @Query('format') format?: string,
  ) {
    if ((format ?? '').toLowerCase() !== 'csv') {
      throw new HttpException(
        { status: 'error', message: 'Only format=csv is supported' },
        HttpStatus.BAD_REQUEST,
      );
    }

    const csv = await this.profilesService.exportProfiles(query);
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}Z$/, 'Z');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="profiles_${timestamp}.csv"`,
    );
    res.send(csv);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.profilesService.getProfileById(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.profilesService.deleteProfile(id);
  }
}

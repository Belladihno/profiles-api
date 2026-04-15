import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ValidationExceptionFilter } from './filters/validation-exeception.filter';
import { AllExceptionsFilter } from './filters/all-execptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: '*' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );
  app.useGlobalFilters(
    new ValidationExceptionFilter(),
    new AllExceptionsFilter(),
  );
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ValidationExceptionFilter } from './filters/validation-exeception.filter';
import { AllExceptionsFilter } from './filters/all-execptions.filter';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import csurf from 'csurf';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import type {
  NextFunction,
  Request,
  Response,
  Express,
  RequestHandler,
} from 'express';
import { VersioningType } from '@nestjs/common';

function getUserIdFromAuthHeader(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return undefined;
  }

  const token = authHeader.slice(7);
  const parts = token.split('.');
  if (parts.length !== 3) {
    return undefined;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(
        parts[1].replace(/-/g, '+').replace(/_/g, '/'),
        'base64',
      ).toString('utf8'),
    ) as { userId?: unknown };

    return typeof payload.userId === 'string' ? payload.userId : undefined;
  } catch {
    return undefined;
  }
}

function resolveTrustProxy(): boolean | number | string {
  const trustProxy = process.env.TRUST_PROXY?.trim();

  if (!trustProxy) {
    return process.env.NODE_ENV === 'production' ? 1 : false;
  }

  if (trustProxy === 'true') {
    return true;
  }

  if (trustProxy === 'false') {
    return false;
  }

  const asNumber = Number(trustProxy);
  if (Number.isInteger(asNumber) && asNumber >= 0) {
    return asNumber;
  }

  return trustProxy;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const expressApp = app.getHttpAdapter().getInstance() as Express;
  expressApp.set('trust proxy', resolveTrustProxy());

  app.enableVersioning({
    type: VersioningType.HEADER,
    header: 'X-API-Version',
  });
  app.setGlobalPrefix('api', {
    exclude: [
      'auth/github',
      'auth/github/callback',
      'auth/refresh',
      'auth/logout',
    ],
  });

  app.use((req: Request, res: Response, next: NextFunction) => {
    const startedAt = Date.now();
    res.on('finish', () => {
      const durationMs = Date.now() - startedAt;
      console.log(
        `${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs}ms`,
      );
    });
    next();
  });

  app.use(cookieParser());
  app.use(
    session({
      // Used by OAuth state/PKCE during the GitHub redirect flow.
      secret:
        process.env.SESSION_SECRET ??
        process.env.JWT_SECRET ??
        'dev-only-session-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 10 * 60 * 1000,
      },
    }),
  );

  app.use('/auth', rateLimit({ windowMs: 60000, max: 10 }));
  app.use(
    '/api/profiles',
    (req: Request, res: Response, next: NextFunction) => {
      const apiVersion = req.header('X-API-Version');

      if (!apiVersion) {
        return res.status(400).json({
          status: 'error',
          message: 'API version header required',
        });
      }

      if (apiVersion !== '1') {
        return res.status(400).json({
          status: 'error',
          message: 'Unsupported API version',
        });
      }

      next();
    },
  );

  // CSRF protection for stateful browser requests (uses session).
  const csrfMiddleware = (
    csurf as (options?: { cookie?: boolean }) => RequestHandler
  )({ cookie: false });
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Skip CSRF for auth endpoints and safe methods
    if (
      req.path.startsWith('/auth') ||
      req.method === 'GET' ||
      req.method === 'HEAD' ||
      req.method === 'OPTIONS' ||
      req.path === '/csrf-token'
    ) {
      return next();
    }

    if (typeof csrfMiddleware === 'function') {
      return csrfMiddleware(req, res, next);
    }

    return next();
  });

  // Expose a simple endpoint to retrieve CSRF token for browser clients
  expressApp.get(
    '/csrf-token',
    (req: Request & { csrfToken?: () => string }, res: Response) => {
      const token =
        typeof req.csrfToken === 'function' ? req.csrfToken() : null;
      return res.json({ status: 'success', csrfToken: token });
    },
  );

  app.use(
    rateLimit({
      windowMs: 60000,
      max: 60,
      skip: (req: Request) => req.path.startsWith('/auth'),
      keyGenerator: (req: Request) =>
        getUserIdFromAuthHeader(req) ?? ipKeyGenerator(req.ip ?? 'unknown'),
    }),
  );

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

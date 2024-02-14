import {
  BadRequestException,
  Logger,
  RequestMethod,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { DocumentBuilder } from '@nestjs/swagger/dist';
import { ValidationError } from 'class-validator';
import * as express from 'express';
import * as basicAuth from 'express-basic-auth';
import helmet from 'helmet';
import * as path from 'path';
import {
  initializeTransactionalContext,
  patchTypeORMRepositoryWithBaseRepository,
} from 'typeorm-transactional-cls-hooked';
import { AppModule } from './app.module';
import { GlobalResponseInterceptor } from './monitrix-auth/common/http/response';

const SWAGGER_ENVS = ['development', 'local'];

async function bootstrap() {
  //typeorm transactional cls hooks for Bulk DB transaction
  initializeTransactionalContext(); // Initialize cls-hooked
  patchTypeORMRepositoryWithBaseRepository(); // patch Repository with BaseRepository.

  const app = await NestFactory.create(AppModule, {
    logger: new Logger('ApplicationStartUp'),
  });

  app.use(function (
    req: { headers: { origin: any; host: any } },
    res: any,
    next: () => void,
  ) {
    req.headers.origin = req.headers.origin || req.headers.host;
    res.set({ 'X-Powered-By': 'Monitrix' });
    next();
  });
  const options = {
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    preflightContinue: false,
    optionsSuccessStatus: 204,
    credentials: true,
  };

  app.enableCors(options);
  // const whitelist = [
  //   'dev-frontend.monitrix.online',
  //   'dev.monitrix.online',
  //   'localhost:7000',
  //   'localhost:5001',
  //   'dev-api.monitrix.online',
  // ];
  // app.enableCors({
  //   origin: function (origin, callback) {
  //     if (whitelist.indexOf(origin) !== -1) {
  //       console.log('allowed cors for:', origin);
  //       callback(null, true);
  //     } else {
  //       console.log('blocked cors for:', origin);
  //       callback(new Error('Not allowed by CORS'));
  //       // callback(null, true);
  //     }
  //   },
  //   allowedHeaders:
  //     'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept, Observe',
  //   methods: 'GET,PUT,POST,DELETE,UPDATE,OPTIONS,PATCH',
  //   credentials: true,
  // });

  app.use(helmet());

  //set basic auth for accessing swagger api
  if (SWAGGER_ENVS.includes(process.env.NODE_ENV || 'development')) {
    app.use(
      ['/apidoc'],
      basicAuth({
        challenge: true,
        users: {
          [process.env.SWAGGER_USER]: process.env.SWAGGER_PASSWORD,
        },
      }),
    );
  }
  //serve static file from directory
  app.use('/public', express.static(path.join(__dirname, '../..', 'public')));

  // serve ip from request
  // app.use(requestIp.mw());

  //setting the global prefix for routing and versiong routes
  app.setGlobalPrefix('api', {
    exclude: [{ path: '', method: RequestMethod.GET }],
  });
  app.enableVersioning({
    type: VersioningType.URI,
  });
  // app.useGlobalPipes(new CustomValidationPipe());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },

      // exception factory for custom validation error message as key value pair
      exceptionFactory: (validationErrors: ValidationError[] = []) => {
        const response_data = {};

        validationErrors.filter(function (values) {
          if (values.children && values.children.length > 0) {
            values.children.map((element) => {
              if (element.children && element.children.length > 0) {
                //check for multi level validation error message
                element.children.map((elementNext) => {
                  response_data[elementNext.property] = [];
                  Object.keys(elementNext.constraints).map((k) => {
                    response_data[elementNext.property].push(
                      elementNext.constraints[k],
                    );
                  });
                });
              } else {
                response_data[element.property] = [];
                Object.keys(element.constraints).map((k) => {
                  response_data[element.property].push(element.constraints[k]);
                });
              }
            });
          } else {
            response_data[values.property] = Object.keys(
              values.constraints,
            ).map((k) => values.constraints[k]);
          }
        });

        return new BadRequestException({
          statusCode: 400,
          message: 'Validation failed',
          errors: Object.values(response_data)
            .flat()
            .map((errorMessage: string) => {
              return (
                errorMessage.charAt(0).toUpperCase() + errorMessage.slice(1)
              );
            }),
        });
      },
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('MONITRIX')
    .setDescription('MONITRIX Backend API')
    .setVersion('1.0')
    .setLicense('MONITRIX', 'https://dev-portal.monitrix.online/')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT Token',
        in: 'header',
      },
      'jwt',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('apidoc', app, document);

  //global response interceptor
  app.useGlobalInterceptors(new GlobalResponseInterceptor());
  //global exception filter for DB/HTTP
  // app.useGlobalFilters(new GlobalExceptionFilter());

  //configure app port
  const app_port = parseInt(process.env.APP_PORT) || 7000;
  //start app server
  await app.listen(app_port);
  //log application startup
  Logger.log(`Application is running on port: ${app_port}`);
  Logger.log(`🔥 Server running at http://localhost:${app_port}`);
  Logger.log(
    `🔥 Api doc server started at http://localhost:${app_port}/apidoc`,
  );
}
bootstrap();

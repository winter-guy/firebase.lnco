import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Specify allowed origins in the array
  app.enableCors({
    origin: process.env.CORS_ORIGIN,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, // enable cookies
  });
  
  await app.listen(3000);
}

bootstrap();

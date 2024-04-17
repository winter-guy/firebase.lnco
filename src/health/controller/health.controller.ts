import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  constructor() {}

  @Get('status')
  checkHealth(): { status: string } {
    return { status: 'OK' }; // You can customize this response based on your application's health criteria
  }
}

import { Test, TestingModule } from '@nestjs/testing';
import { OpsController } from './ops.controller';

describe('OpsController', () => {
  let controller: OpsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OpsController],
    }).compile();

    controller = module.get<OpsController>(OpsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

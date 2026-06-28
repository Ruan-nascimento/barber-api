import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    if (this.configService.get<string>('app.nodeEnv') === 'test') {
      return;
    }
  }

  async onModuleDestroy(): Promise<void> {}
}

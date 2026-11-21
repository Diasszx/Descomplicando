import { ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ThrottlerGuard, type ThrottlerLimitDetail } from '@nestjs/throttler';

@Injectable()
export class FonoThrottlerGuard extends ThrottlerGuard {
  protected override async throwThrottlingException(
    _context: ExecutionContext,
    _throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        code: 'TOO_MANY_REQUESTS',
        message: 'Muitas tentativas seguidas. Aguarde alguns instantes e tente novamente.',
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

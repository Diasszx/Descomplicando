import { SetMetadata } from '@nestjs/common';

export const ALLOW_PENDING_SESSION_KEY = 'fono:auth:allow_pending_session';

export const AllowPendingSession = () => SetMetadata(ALLOW_PENDING_SESSION_KEY, true);

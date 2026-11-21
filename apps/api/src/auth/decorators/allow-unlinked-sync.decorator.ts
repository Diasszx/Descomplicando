import { SetMetadata } from '@nestjs/common';

export const ALLOW_UNLINKED_SYNC_KEY = 'fono:auth:allow_unlinked_sync';

export const AllowUnlinkedSync = () => SetMetadata(ALLOW_UNLINKED_SYNC_KEY, true);

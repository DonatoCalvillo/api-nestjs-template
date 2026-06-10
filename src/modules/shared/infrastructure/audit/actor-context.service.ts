import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import {
  ActorSnapshot,
  ANONYMOUS_ACTOR,
} from '../../application/audit/types/actor-snapshot';
import {
  CLS_ACTOR,
  CLS_IP_ADDRESS,
  CLS_REQUEST_ID,
} from './actor-context.constants';

@Injectable()
export class ActorContextService {
  constructor(private readonly cls: ClsService) {}

  getActor(): ActorSnapshot {
    return this.cls.get<ActorSnapshot>(CLS_ACTOR) ?? ANONYMOUS_ACTOR;
  }

  setActor(actor: ActorSnapshot): void {
    this.cls.set(CLS_ACTOR, actor);
  }

  getRequestId(): string | undefined {
    return this.cls.get<string>(CLS_REQUEST_ID);
  }

  setRequestId(requestId: string): void {
    this.cls.set(CLS_REQUEST_ID, requestId);
  }

  getIpAddress(): string | undefined {
    return this.cls.get<string>(CLS_IP_ADDRESS);
  }

  setIpAddress(ipAddress: string | null | undefined): void {
    if (ipAddress) {
      this.cls.set(CLS_IP_ADDRESS, ipAddress);
    }
  }
}

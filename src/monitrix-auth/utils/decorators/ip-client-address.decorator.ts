import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import * as requestIp from 'request-ip';

export const IpPlusClientAddress = createParamDecorator(
  (data, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();

    if (req.clientIp) return req.clientIp;
    const ip = requestIp.getClientIp(req); // In case we forgot to include requestIp.mw() in main.ts
    const browser = req.headers['user-agent'];

    return {
      ip: req.headers['x-real-ip'] ?? ip,
      browser: browser,
    };
  },
);

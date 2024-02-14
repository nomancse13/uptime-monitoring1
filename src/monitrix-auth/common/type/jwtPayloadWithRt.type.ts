import { UserInterface } from '../interfaces/user.interface';

export type JwtPayloadWithRt = UserInterface & { refreshToken: string };

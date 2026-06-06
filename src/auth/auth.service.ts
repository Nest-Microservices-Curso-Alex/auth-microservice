import { Injectable, Logger } from '@nestjs/common';
import { User } from './schema/user.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RpcException } from '@nestjs/microservices';
import mongoose from 'mongoose';
import { LoginUserDto, RegisterUserDto } from './dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { envs } from 'src/config';

@Injectable()
export class AuthService {
  private readonly logger = new Logger('AuthService');

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly jwtService: JwtService,
  ) {
    this.logger.log('MongoDB connected');
  }

  signJWT(payload: JwtPayload) {
    return this.jwtService.sign(payload);
  }

  verifyToken(token: string) {
    try {
      const payload = this.jwtService.verify<
        JwtPayload & { iat?: number; exp?: number }
      >(token, {
        secret: envs.jwtSecret,
      });

      const { iat, exp, ...user } = payload;
      void iat;
      void exp;

      const newToken = this.signJWT(user);

      return {
        user,
        token: newToken,
      };
    } catch (error) {
      console.error(error);
      throw new RpcException({
        status: 401,
        message: 'Invalid token',
      });
    }
  }

  async registerUser(registerUserDto: RegisterUserDto) {
    const { email, name, password } = registerUserDto;
    try {
      const user: User | null = await this.userModel.findOne({ email });

      if (user) {
        throw new RpcException({
          status: 400,
          message: 'User already exist',
        });
      }

      const hashPass = bcrypt.hashSync(password, 10);

      const newUser: User = await this.userModel.create({
        email,
        password: hashPass,
        name,
      });

      const payload = {
        id: newUser._id.toString(),
        email: newUser.email,
        name: newUser.name,
      };

      const jwtToken = this.signJWT(payload);

      return {
        user: payload,
        token: jwtToken,
      };
    } catch (error: unknown) {
      // Verificamos si es un error de validación de Mongoose
      if (error instanceof mongoose.Error.ValidationError) {
        throw new RpcException({
          status: 400,
          message: Object.values(error.errors)
            .map((err) => err.message)
            .join(', '),
        });
      }
      throw error;
    }
  }

  async loginUser(loginUserDto: LoginUserDto) {
    const { email, password } = loginUserDto;

    try {
      const user: User | null = await this.userModel.findOne({ email });

      if (!user) {
        throw new RpcException({
          status: 400,
          message: 'User/Password not valid',
        });
      }

      const isPassValid = bcrypt.compareSync(password, user.password);

      if (!isPassValid) {
        throw new RpcException({
          status: 400,
          message: 'User/Password not valid',
        });
      }

      const payload = {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
      };

      const jwtToken = this.signJWT(payload);

      return {
        user: payload,
        token: jwtToken,
      };
    } catch (error: unknown) {
      // Verificamos si es un error de validación de Mongoose
      if (error instanceof mongoose.Error.ValidationError) {
        throw new RpcException({
          status: 400,
          message: Object.values(error.errors)
            .map((err) => err.message)
            .join(', '),
        });
      }
      throw error;
    }
  }
}

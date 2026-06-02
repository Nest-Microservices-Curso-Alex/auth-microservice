import 'dotenv/config';
import * as joi from 'joi';

interface EnvVars {
  PORT: number;
  NATS_SERVERS: string[];
}

const envsSchema = joi
  .object({
    PORT: joi.number().required(),
    NATS_SERVERS: joi.array().items(joi.string()).required(),
  })
  .unknown(true);

const res = envsSchema.validate({
  ...process.env,
  NATS_SERVERS: process.env.NATS_SERVERS?.split(','),
});

if (res.error) {
  throw new Error(`Config validation error: ${res.error.message}`);
}

const envVars: EnvVars = res.value as EnvVars;

export const envs = {
  port: envVars.PORT,
  natsServer: envVars.NATS_SERVERS,
};

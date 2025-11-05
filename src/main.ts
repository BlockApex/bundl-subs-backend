import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import cookieParser from "cookie-parser";
import { config } from "dotenv";
import express from "express";
import { readFileSync } from "fs";
import http from "http";
import https from "https";
import { AppModule } from "./app.module";
import "./extras/bigint-toJSON";
import { ShutdownObserver } from "./extras/shutdown-observer";

config();

async function bootstrap() {
  const server = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
    logger: ["error", "warn", "log", "debug", "verbose"],
    cors: {
      origin: [/localhost$/, /bundlsubs\.com$/, /172.18.0.20/],
      optionsSuccessStatus: 200,
      credentials: true,
    },
  });

  // Enable global validation pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.use(cookieParser());

  // Retrieve ConfigService
  const configService = app.get(ConfigService);

  // Read port from config (e.g., .env file)
  const port = configService.get<number>("PORT") || 3000;
  await app.init();
  const httpServer = http.createServer(server).listen(port);
  new Logger("bootstrap").log(`🚀 App is running on http://localhost:${port}`);

  const shutdownObserver = app.get(ShutdownObserver);
  shutdownObserver.addHttpServer(httpServer);

  // use https server if not production
  if (configService.get<string>("NODE_ENV") !== "production") {
    const httpsOptions = {
      key: readFileSync("./secrets/private-key.pem"),
      cert: readFileSync("./secrets/public-certificate.pem"),
    };
    const httpsServer = https.createServer(httpsOptions, server).listen(443);
    shutdownObserver.addHttpServer(httpsServer);
  }
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});

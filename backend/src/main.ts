import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import { config } from "dotenv";
import { AppModule } from "./app.module";
config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ["error", "warn", "log"],
    cors: {
      origin: /orbitearn\.com$/,
      optionsSuccessStatus: 200,
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

  await app.listen(port);
  new Logger("bootstrap").log(`🚀 App is running on http://localhost:${port}`);
}
bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});

// import { Keypair } from "@solana/web3.js";
// import base58 from "bs58";
// import nacl from "tweetnacl";
// import naclUtil from "tweetnacl-util";

// function printSignature() {
//   const keypair = Keypair.fromSecretKey(
//     base58.decode(
//       "<Private Key Here>",
//     ),
//   );

//   const message = "Sign this message to verify your wallet address";
//   const messageBytes = naclUtil.decodeUTF8(message);

//   const signature = nacl.sign.detached(messageBytes, keypair.secretKey);
//   console.log("Public Key:", keypair.publicKey.toBase58());
//   console.log("Signature:", base58.encode(signature));

//   const result = nacl.sign.detached.verify(
//     messageBytes,
//     signature,
//     keypair.publicKey.toBytes(),
//   );

//   console.log("Verified:", result);
// }
// printSignature();

import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class AddToWaitlistDto {
  @IsString()
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}

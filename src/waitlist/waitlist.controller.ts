import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { AddToWaitlistDto } from "./dto/add-to-waitlist.dto";
import { WaitlistService } from "./waitlist.service";

@Controller("waitlist")
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async addToWaitlist(@Body() body: AddToWaitlistDto): Promise<void> {
    await this.waitlistService.addToWaitlist(body.email);
  }
}

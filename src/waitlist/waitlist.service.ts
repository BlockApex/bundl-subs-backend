import { ConflictException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Waitlist, WaitlistDocument } from "./schemas/waitlist.schema";

@Injectable()
export class WaitlistService {
  constructor(
    @InjectModel(Waitlist.name)
    private waitlistModel: Model<WaitlistDocument>,
  ) {}

  async addToWaitlist(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already exists
    const existingEntry = await this.waitlistModel.findOne({
      email: normalizedEmail,
    });

    if (existingEntry) {
      throw new ConflictException("Email already exists in waitlist");
    }

    const waitlist = new this.waitlistModel({ email: normalizedEmail });
    await waitlist.save();
  }
}

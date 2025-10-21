import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { BundleHelperService } from "./bundle-helper.service";
import { BundlePreviewRequestDto } from "./dto/bundle-preview-request.dto";
import { BundlePreviewResponseDto } from "./dto/bundle-preview-response.dto";

@Controller("bundle-helper")
export class BundleHelperController {
  constructor(private readonly bundleHelperService: BundleHelperService) {}

  @Post("preview")
  @HttpCode(HttpStatus.OK)
  async previewBundle(
    @Body() request: BundlePreviewRequestDto,
  ): Promise<BundlePreviewResponseDto> {
    return this.bundleHelperService.previewBundle(request);
  }
}

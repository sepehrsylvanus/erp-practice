import { beforeEach, describe, expect, it, vi } from "vitest";
import { Test } from "@nestjs/testing";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";

describe("AppController", () => {
  let controller: AppController;
  const response = { message: "Welome to backend!" };
  const getData = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();
    getData.mockReturnValue(response);

    const moduleRef = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: AppService, useValue: { getData } }],
    }).compile();
    controller = moduleRef.get(AppController);
  });
  it("Get result from AppService and return them", () => {
    expect(controller.getData()).toEqual(response);
    expect(getData).toHaveBeenCalledTimes(1);
  });
});

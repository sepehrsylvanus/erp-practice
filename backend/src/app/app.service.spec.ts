import { AppService } from "./app.service";

describe("AppService", () => {
  let service: AppService;

  beforeEach(() => {
    service = new AppService();
  });

  it("پیام پیش فرض اپ را برمیگرداند", () => {
    expect(service.getData()).toEqual({ message: "Welcome to backend!" });
  });
});

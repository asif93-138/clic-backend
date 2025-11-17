import mongoose from "mongoose";

describe("Database connection", () => {
  it("should be connected", () => {
    // 1 = connected
    expect(mongoose.connection.readyState).toBe(1);
  });
});

import mongoose from "mongoose";

describe("Database online test", () => {
    it("should match the database name (clicDB)", async () => {
    expect(mongoose.connection.db?.databaseName).toBe("clicDB");
});
});

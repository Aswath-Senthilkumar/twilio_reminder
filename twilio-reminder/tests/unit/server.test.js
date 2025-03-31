// Test to check the server startup

describe("Server Startup", () => {
  it("should load index.js without throwing an error", () => {
    expect(() => {
      require("../../index");
    }).not.toThrow();
  });
});

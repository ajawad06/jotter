const { expect } = require("chai");

const { createUserRepository } = require("../src/repositories/user.repository");

describe("User repository", () => {
  it("returns first user by email", async () => {
    const fakeModel = {
      findOne: () => ({
        lean: async () => ({
          _id: "507f1f77bcf86cd799439011",
          name: "Abdullah",
          email: "abdullah@example.com",
          password_hash: "hash",
        }),
      }),
    };

    const repository = createUserRepository(fakeModel);
    const user = await repository.findByEmail("abdullah@example.com");

    expect(user.id).to.equal("507f1f77bcf86cd799439011");
    expect(user.email).to.equal("abdullah@example.com");
  });

  it("creates user and returns inserted shape", async () => {
    const fakeModel = {
      create: async ({ name, email, password_hash }) => ({
        _id: "507f1f77bcf86cd799439012",
        name,
        email,
        password_hash,
      }),
    };

    const repository = createUserRepository(fakeModel);
    const created = await repository.createUser({
      name: "Abdullah",
      email: "abdullah@example.com",
      passwordHash: "hash-value",
    });

    expect(created).to.deep.equal({
      id: "507f1f77bcf86cd799439012",
      name: "Abdullah",
      email: "abdullah@example.com",
    });
  });
});

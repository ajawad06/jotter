const { expect } = require("chai");

const { createUserRepository } = require("../src/repositories/user.repository");

describe("User repository", () => {
  it("returns first user by email", async () => {
    const fakeDb = {
      execute: async () => [
        [
          {
            id: 5,
            name: "Abdullah",
            email: "abdullah@example.com",
            passwordHash: "hash",
          },
        ],
      ],
    };

    const repository = createUserRepository(fakeDb);
    const user = await repository.findByEmail("abdullah@example.com");

    expect(user.id).to.equal(5);
    expect(user.email).to.equal("abdullah@example.com");
  });

  it("creates user and returns inserted shape", async () => {
    const fakeDb = {
      execute: async () => [{ insertId: 11 }],
    };

    const repository = createUserRepository(fakeDb);
    const created = await repository.createUser({
      name: "Abdullah",
      email: "abdullah@example.com",
      passwordHash: "hash-value",
    });

    expect(created).to.deep.equal({
      id: 11,
      name: "Abdullah",
      email: "abdullah@example.com",
    });
  });
});

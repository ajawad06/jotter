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

  it("finds a user by a valid email verification token hash", async () => {
    const expiresAt = new Date(Date.now() + 60000);
    const fakeModel = {
      findOne: () => ({
        select: () => ({
          lean: async () => ({
            _id: "507f1f77bcf86cd799439011",
            is_email_verified: false,
            email_verification_expires: expiresAt,
          }),
        }),
      }),
    };

    const repository = createUserRepository(fakeModel);
    const record =
      await repository.findByEmailVerificationTokenHash("hash-value");

    expect(record).to.deep.equal({
      id: "507f1f77bcf86cd799439011",
      isEmailVerified: false,
      emailVerificationExpires: expiresAt,
    });
  });

  it("returns null when no user matches the verification token hash", async () => {
    const fakeModel = {
      findOne: () => ({
        select: () => ({
          lean: async () => null,
        }),
      }),
    };

    const repository = createUserRepository(fakeModel);
    const record =
      await repository.findByEmailVerificationTokenHash("missing-hash");

    expect(record).to.be.null;
  });

  it("finds a user by a valid password reset token hash", async () => {
    const expiresAt = new Date(Date.now() + 60000);
    const fakeModel = {
      findOne: () => ({
        select: () => ({
          lean: async () => ({
            _id: "507f1f77bcf86cd799439011",
            password_reset_expires: expiresAt,
          }),
        }),
      }),
    };

    const repository = createUserRepository(fakeModel);
    const record = await repository.findByPasswordResetTokenHash("hash-value");

    expect(record).to.deep.equal({
      id: "507f1f77bcf86cd799439011",
      passwordResetExpires: expiresAt,
    });
  });

  it("stores an email verification token hash and expiry", async () => {
    let capturedUpdate;
    const fakeModel = {
      findByIdAndUpdate: async (userId, update) => {
        capturedUpdate = { userId, update };
      },
    };
    const expiresAt = new Date(Date.now() + 60000);

    const repository = createUserRepository(fakeModel);
    await repository.setEmailVerificationToken("user-1", "hash-value", expiresAt);

    expect(capturedUpdate).to.deep.equal({
      userId: "user-1",
      update: {
        email_verification_token_hash: "hash-value",
        email_verification_expires: expiresAt,
      },
    });
  });

  it("marks a user's email as verified and clears the token", async () => {
    let capturedUpdate;
    const fakeModel = {
      findByIdAndUpdate: async (userId, update) => {
        capturedUpdate = { userId, update };
      },
    };

    const repository = createUserRepository(fakeModel);
    await repository.markEmailVerified("user-1");

    expect(capturedUpdate.userId).to.equal("user-1");
    expect(capturedUpdate.update.is_email_verified).to.equal(true);
    expect(capturedUpdate.update.$unset).to.have.keys(
      "email_verification_token_hash",
      "email_verification_expires",
    );
  });

  it("stores a password reset token hash and expiry", async () => {
    let capturedUpdate;
    const fakeModel = {
      findByIdAndUpdate: async (userId, update) => {
        capturedUpdate = { userId, update };
      },
    };
    const expiresAt = new Date(Date.now() + 60000);

    const repository = createUserRepository(fakeModel);
    await repository.setPasswordResetToken("user-1", "hash-value", expiresAt);

    expect(capturedUpdate).to.deep.equal({
      userId: "user-1",
      update: {
        password_reset_token_hash: "hash-value",
        password_reset_expires: expiresAt,
      },
    });
  });

  it("resets the password hash and clears the reset token", async () => {
    let capturedUpdate;
    const fakeModel = {
      findByIdAndUpdate: async (userId, update) => {
        capturedUpdate = { userId, update };
      },
    };

    const repository = createUserRepository(fakeModel);
    await repository.resetPassword("user-1", "new-hash");

    expect(capturedUpdate.userId).to.equal("user-1");
    expect(capturedUpdate.update.password_hash).to.equal("new-hash");
    expect(capturedUpdate.update.$unset).to.have.keys(
      "password_reset_token_hash",
      "password_reset_expires",
    );
  });

  it("updates a user's profile fields", async () => {
    const fakeModel = {
      findByIdAndUpdate: () => ({
        lean: async () => ({
          _id: "user-1",
          name: "New Name",
          email: "abdullah@example.com",
          profile_image: "img.png",
          profile_color: "#1a73e8",
          is_email_verified: true,
        }),
      }),
    };

    const repository = createUserRepository(fakeModel);
    const updated = await repository.updateUser("user-1", { name: "New Name" });

    expect(updated).to.deep.equal({
      id: "user-1",
      name: "New Name",
      email: "abdullah@example.com",
      passwordHash: undefined,
      profileImage: "img.png",
      profileColor: "#1a73e8",
      isEmailVerified: true,
    });
  });

  it("returns null when updating a missing user", async () => {
    const fakeModel = {
      findByIdAndUpdate: () => ({
        lean: async () => null,
      }),
    };

    const repository = createUserRepository(fakeModel);
    const updated = await repository.updateUser("missing", { name: "X" });

    expect(updated).to.be.null;
  });

  it("returns a user's custom labels", async () => {
    const fakeModel = {
      findById: () => ({
        select: () => ({
          lean: async () => ({ labels: ["travel", "work"] }),
        }),
      }),
    };

    const repository = createUserRepository(fakeModel);
    const labels = await repository.getLabels("user-1");

    expect(labels).to.deep.equal(["travel", "work"]);
  });

  it("adds a label without duplicating it", async () => {
    let capturedUpdate;
    const fakeModel = {
      findByIdAndUpdate: async (userId, update) => {
        capturedUpdate = { userId, update };
      },
    };

    const repository = createUserRepository(fakeModel);
    await repository.addLabel("user-1", "travel");

    expect(capturedUpdate).to.deep.equal({
      userId: "user-1",
      update: { $addToSet: { labels: "travel" } },
    });
  });

  it("renames a label and dedupes the result", async () => {
    let capturedUpdate;
    const fakeModel = {
      findById: () => ({
        select: () => ({
          lean: async () => ({ labels: ["work", "personal"] }),
        }),
      }),
      findByIdAndUpdate: async (userId, update) => {
        capturedUpdate = { userId, update };
      },
    };

    const repository = createUserRepository(fakeModel);
    await repository.renameLabel("user-1", "work", "personal");

    expect(capturedUpdate).to.deep.equal({
      userId: "user-1",
      update: { labels: ["personal"] },
    });
  });
});

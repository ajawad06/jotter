const User = require("../models/user.model");

const createUserRepository = (userModel = User) => ({
  async findByEmail(email) {
    const user = await userModel.findOne({ email }).lean();

    if (!user) {
      return null;
    }

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      passwordHash: user.password_hash,
    };
  },

  async createUser({ name, email, passwordHash }) {
    const createdUser = await userModel.create({
      name,
      email,
      password_hash: passwordHash,
    });

    return {
      id: createdUser._id.toString(),
      name: createdUser.name,
      email: createdUser.email,
    };
  },
});

module.exports = {
  createUserRepository,
};

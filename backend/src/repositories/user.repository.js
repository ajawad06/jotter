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
      profileImage: user.profile_image,
      profileColor: user.profile_color,
    };
  },

  async findById(id) {
    const user = await userModel.findById(id).lean();

    if (!user) {
      return null;
    }

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      profileImage: user.profile_image,
      profileColor: user.profile_color,
    };
  },

  async updateUser(id, updateData) {
    const dbUpdate = {};
    if (updateData.name) dbUpdate.name = updateData.name;
    if (updateData.profileImage !== undefined)
      dbUpdate.profile_image = updateData.profileImage;
    if (updateData.profileColor)
      dbUpdate.profile_color = updateData.profileColor;

    const updatedUser = await userModel
      .findByIdAndUpdate(id, dbUpdate, { new: true })
      .lean();

    if (!updatedUser) {
      return null;
    }

    return {
      id: updatedUser._id.toString(),
      name: updatedUser.name,
      email: updatedUser.email,
      profileImage: updatedUser.profile_image,
      profileColor: updatedUser.profile_color,
    };
  },

  async createUser({ name, email, passwordHash, profileColor }) {
    const createdUser = await userModel.create({
      name,
      email,
      password_hash: passwordHash,
      profile_color: profileColor,
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

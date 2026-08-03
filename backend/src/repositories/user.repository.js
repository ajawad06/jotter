const User = require("../models/user.model");

const mapUser = (user) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  passwordHash: user.password_hash,
  profileImage: user.profile_image,
  profileColor: user.profile_color,
  isEmailVerified: Boolean(user.is_email_verified),
});

const createUserRepository = (userModel = User) => ({
  async findByEmail(email) {
    const user = await userModel.findOne({ email }).lean();

    if (!user) {
      return null;
    }

    return mapUser(user);
  },

  async findById(id) {
    const user = await userModel.findById(id).lean();

    if (!user) {
      return null;
    }

    return mapUser(user);
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

    return mapUser(updatedUser);
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

  async setEmailVerificationToken(userId, tokenHash, expiresAt) {
    await userModel.findByIdAndUpdate(userId, {
      email_verification_token_hash: tokenHash,
      email_verification_expires: expiresAt,
    });
  },

  async findByEmailVerificationTokenHash(tokenHash) {
    const user = await userModel
      .findOne({ email_verification_token_hash: tokenHash })
      .select("+email_verification_token_hash +email_verification_expires")
      .lean();

    if (!user) {
      return null;
    }

    return {
      id: user._id.toString(),
      isEmailVerified: Boolean(user.is_email_verified),
      emailVerificationExpires: user.email_verification_expires,
    };
  },

  async markEmailVerified(userId) {
    await userModel.findByIdAndUpdate(userId, {
      is_email_verified: true,
      $unset: {
        email_verification_token_hash: "",
        email_verification_expires: "",
      },
    });
  },

  async setPasswordResetToken(userId, tokenHash, expiresAt) {
    await userModel.findByIdAndUpdate(userId, {
      password_reset_token_hash: tokenHash,
      password_reset_expires: expiresAt,
    });
  },

  async findByPasswordResetTokenHash(tokenHash) {
    const user = await userModel
      .findOne({ password_reset_token_hash: tokenHash })
      .select("+password_reset_token_hash +password_reset_expires")
      .lean();

    if (!user) {
      return null;
    }

    return {
      id: user._id.toString(),
      passwordResetExpires: user.password_reset_expires,
    };
  },

  async resetPassword(userId, passwordHash) {
    await userModel.findByIdAndUpdate(userId, {
      password_hash: passwordHash,
      $unset: {
        password_reset_token_hash: "",
        password_reset_expires: "",
      },
    });
  },

  async updatePassword(userId, passwordHash) {
    await userModel.findByIdAndUpdate(userId, { password_hash: passwordHash });
  },

  async deleteUser(userId) {
    await userModel.findByIdAndDelete(userId);
  },

  async getLabels(userId) {
    const user = await userModel.findById(userId).select("labels").lean();
    return user?.labels || [];
  },

  async addLabel(userId, label) {
    await userModel.findByIdAndUpdate(userId, {
      $addToSet: { labels: label },
    });
  },

  async renameLabel(userId, oldLabel, newLabel) {
    const user = await userModel.findById(userId).select("labels").lean();

    if (!user) {
      return;
    }

    const nextLabels = Array.from(
      new Set(
        (user.labels || []).map((label) =>
          label === oldLabel ? newLabel : label,
        ),
      ),
    );

    await userModel.findByIdAndUpdate(userId, { labels: nextLabels });
  },
});

module.exports = {
  createUserRepository,
};

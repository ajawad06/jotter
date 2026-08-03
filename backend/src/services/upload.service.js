const AppError = require("../utils/appError");

const createUploadService = ({ cloudinary }) => ({
  async uploadBuffer(buffer, { folder, filename } = {}) {
    if (!cloudinary?.config()?.cloud_name) {
      throw new AppError("Cloudinary is not configured", 503);
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder, resource_type: "auto", filename_override: filename },
        (error, result) => {
          if (error) {
            return reject(new AppError(error.message || "Upload failed", 502));
          }

          return resolve({
            url: result.secure_url,
            publicId: result.public_id,
            size: result.bytes,
            resourceType: result.resource_type,
          });
        },
      );

      uploadStream.end(buffer);
    });
  },

  async deleteByPublicId(publicId, resourceType = "image") {
    if (!publicId) {
      return;
    }

    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  },
});

module.exports = {
  createUploadService,
};

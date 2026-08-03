const { expect } = require("chai");

const { createUploadService } = require("../src/services/upload.service");
const AppError = require("../src/utils/appError");

describe("Upload service", () => {
  it("rejects uploads when Cloudinary is not configured", async () => {
    const uploadService = createUploadService({
      cloudinary: { config: () => ({}) },
    });

    try {
      await uploadService.uploadBuffer(Buffer.from("data"));
      throw new Error("Expected uploadBuffer to fail");
    } catch (error) {
      expect(error).to.be.instanceOf(AppError);
      expect(error.statusCode).to.equal(503);
    }
  });

  it("uploads a buffer and normalizes the Cloudinary result", async () => {
    let endedBuffer;
    let capturedOptions;
    const cloudinary = {
      config: () => ({ cloud_name: "demo" }),
      uploader: {
        upload_stream: (options, callback) => {
          capturedOptions = options;
          return {
            end: (buffer) => {
              endedBuffer = buffer;
              callback(null, {
                secure_url: "https://cdn/x.png",
                public_id: "notes/x",
                bytes: 1234,
                resource_type: "image",
              });
            },
          };
        },
      },
    };

    const uploadService = createUploadService({ cloudinary });
    const result = await uploadService.uploadBuffer(Buffer.from("bytes"), {
      folder: "notes",
      filename: "x.png",
    });

    expect(capturedOptions.folder).to.equal("notes");
    expect(capturedOptions.filename_override).to.equal("x.png");
    expect(endedBuffer.toString()).to.equal("bytes");
    expect(result).to.deep.equal({
      url: "https://cdn/x.png",
      publicId: "notes/x",
      size: 1234,
      resourceType: "image",
    });
  });

  it("rejects with a 502 when Cloudinary reports an error", async () => {
    const cloudinary = {
      config: () => ({ cloud_name: "demo" }),
      uploader: {
        upload_stream: (_options, callback) => ({
          end: () => callback(new Error("boom")),
        }),
      },
    };

    const uploadService = createUploadService({ cloudinary });

    try {
      await uploadService.uploadBuffer(Buffer.from("bytes"));
      throw new Error("Expected uploadBuffer to fail");
    } catch (error) {
      expect(error).to.be.instanceOf(AppError);
      expect(error.statusCode).to.equal(502);
      expect(error.message).to.equal("boom");
    }
  });

  it("skips deletion when no publicId is provided", async () => {
    let destroyCalled = false;
    const uploadService = createUploadService({
      cloudinary: {
        uploader: {
          destroy: async () => {
            destroyCalled = true;
          },
        },
      },
    });

    await uploadService.deleteByPublicId("");
    expect(destroyCalled).to.equal(false);
  });

  it("deletes an asset by publicId with the given resource type", async () => {
    let destroyArgs;
    const uploadService = createUploadService({
      cloudinary: {
        uploader: {
          destroy: async (publicId, options) => {
            destroyArgs = { publicId, options };
          },
        },
      },
    });

    await uploadService.deleteByPublicId("notes/x", "raw");
    expect(destroyArgs).to.deep.equal({
      publicId: "notes/x",
      options: { resource_type: "raw" },
    });
  });
});

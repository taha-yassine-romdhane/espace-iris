import type { NextApiRequest, NextApiResponse } from "next";
import { createUploadthing, type FileRouter } from "uploadthing/next-legacy";
import { UploadThingError } from "uploadthing/server";

// Initialize UploadThing with environment variables
const f = createUploadthing();

// Log environment variables (without exposing sensitive values)
console.log("UploadThing Environment Check:", {
  APP_ID_SET: !!process.env.UPLOADTHING_APP_ID,
  SECRET_SET: !!process.env.UPLOADTHING_SECRET,
});

// Simple auth function - you can replace this with your actual auth logic
const auth = async (req: NextApiRequest, res: NextApiResponse) => {
  // For now, we'll allow all uploads but you can implement proper auth checks
  // This could be a JWT check, session validation, etc.
  return { id: "admin", role: "ADMIN" };
}

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
  // Main image uploader route for product images, diagnostic images, etc.
  imageUploader: f({
    image: {
      maxFileSize: "8MB",
      maxFileCount: 5,
    },
  })
  
  // Document uploader for PDFs, Word docs, etc.
  .middleware(async ({ req, res }) => {
    const user = await auth(req, res);
    if (!user) throw new UploadThingError("Unauthorized");
    return { userId: user.id, role: user.role };
  })
  .onUploadComplete(async ({ metadata, file }) => {
    console.log("Upload complete for userId:", metadata.userId);
    console.log("File URL:", file.url);
    
    return { 
      url: file.url,
      name: file.name,
      size: file.size,
      type: file.type,
      key: file.key,
      uploadedBy: metadata.userId 
    };
  }),
  
  // Multi-file uploader for galleries, multiple documents, etc.
  multiUploader: f([
    "image",
    "pdf",
    "video",
    "audio",
    "text"
  ])
    .middleware(async ({ req, res }) => {
      const user = await auth(req, res);
      if (!user) throw new UploadThingError("Unauthorized");
      return { userId: user.id, role: user.role };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Multi-file upload complete for userId:", metadata.userId);
      console.log("File URL:", file.url);
      
      return { 
        url: file.url,
        name: file.name,
        size: file.size,
        type: file.type,
        key: file.key,
        uploadedBy: metadata.userId 
      };
    }),
    
  // Document uploader specifically for patient records
  documentUploader: f({
    pdf: { maxFileSize: "16MB", maxFileCount: 10 },
    image: { maxFileSize: "8MB", maxFileCount: 10 },
    text: { maxFileSize: "1MB", maxFileCount: 10 },
  })
  .middleware(async ({ req, res }) => {
    const user = await auth(req, res);
    if (!user) throw new UploadThingError("Unauthorized");
    return { userId: user.id, role: user.role };
  })
  .onUploadComplete(async ({ metadata, file }) => {
    console.log("Document upload complete for userId:", metadata.userId);
    console.log("File URL:", file.url);
    
    return { 
      url: file.url,
      name: file.name,
      size: file.size,
      type: file.type,
      key: file.key,
      uploadedBy: metadata.userId 
    };
  }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;

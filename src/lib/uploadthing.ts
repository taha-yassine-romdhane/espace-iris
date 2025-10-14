/**
 * Configuration for UploadThing
 * This ensures environment variables are properly loaded
 */

// Check if environment variables are defined
if (!process.env.UPLOADTHING_SECRET || !process.env.UPLOADTHING_APP_ID) {
  console.warn(
    "Warning: UploadThing environment variables are missing. File uploads may not work correctly."
  );
}

// Export environment variables for use in the application
export const uploadThingConfig = {
  appId: process.env.UPLOADTHING_APP_ID || "",
  apiKey: process.env.UPLOADTHING_SECRET || "",
};

import { createRouteHandler } from "uploadthing/next-legacy";

import { ourFileRouter } from "@/server/uploadthing";

// Export handler to process UploadThing requests
const handler = createRouteHandler({
  router: ourFileRouter,
});

export default handler;

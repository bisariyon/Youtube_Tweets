import { Router } from "express";
import {
  deleteVideo,
  getAllVideos,
  getVideoById,
  publishAVideo,
  togglePublishStatus,
  updateVideoDetails,
  updateVideoThumbnail,
} from "../controllers/video.controller.js";
import { verifyJwtToken } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.use(verifyJwtToken); // Apply verifyJWT middleware to all routes in this file

router
  .route("/")
  .get(getAllVideos)  //left
  .post(
    upload.fields([
      { name: "videoFile", maxCount: 1 },
      { name: "thumbnail", maxCount: 1 },
    ]),
    publishAVideo
  );

router
  .route("/:videoId")
  .get(getVideoById)
  .delete(deleteVideo)
  .patch(upload.none(), updateVideoDetails);

router
  .route("/thumbnail/:videoId")
  .patch(upload.single("thumbnail"), updateVideoThumbnail);

router.route("/toggle/:videoId").patch(togglePublishStatus);

export default router;

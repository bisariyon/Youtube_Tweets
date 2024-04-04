import { Router } from "express";
import {
  loginUser,
  logoutUser,
  registerUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateAvatar,
  updateCoverImage,
  deleteUser,
  getUserChannelProfile,
  getWatchHistory,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJwtToken } from "../middlewares/auth.middleware.js";

const router = Router();

//middleware upload
router.route("/register").post(
  //http://localhost:8000/api/v1/users/register
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  registerUser
);

router.route("/login").post(upload.none(), loginUser); //TODO check this why need middleware for forms

//secured routes
router.route("/logout").post(verifyJwtToken, logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-password").post(verifyJwtToken, changeCurrentPassword);
router.route("/current-user").get(verifyJwtToken, getCurrentUser);
router.route("/update-account").patch(verifyJwtToken, updateAccountDetails);

router
  .route("/avatar")
  .patch(verifyJwtToken, upload.single("avatar"), updateAvatar);
router
  .route("/cover-image")
  .patch(verifyJwtToken, upload.single("coverImage"), updateCoverImage);

router.route("/deleteUser").delete(verifyJwtToken, deleteUser);

router.route("/channel/:username").get(getUserChannelProfile);

router.route("/history").get(verifyJwtToken, getWatchHistory);

export default router;

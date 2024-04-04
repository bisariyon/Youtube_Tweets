import { Router } from "express";
import { verifyJwtToken } from "../middlewares/auth.middleware.js";
import {
  getHistory,
  addToHistory,
} from "../controllers/watchHistory.controller.js";
const router = Router();

router.use(verifyJwtToken);

router.route("/:videoId").post(addToHistory);
router.route("/").get(getHistory);

export default router;

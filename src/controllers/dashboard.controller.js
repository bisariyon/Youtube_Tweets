import mongoose from "mongoose";
import { Video } from "../models/videos.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
  const channel = req.user;
  
  const videos = await Video.find({ owner: channel }).select(
    "title views likes"
  );
  const videosCount = videos.length;

  const totalViews = videos.reduce((acc, video) => acc + video.views, 0);

  const totalLikes = videos.reduce((acc, video) => acc + video.likes, 0);

  const subscribers = await Subscription.find({ channel: channel });
  const subscribersCount = subscribers.length;

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { videos, videosCount, totalLikes, totalViews, subscribersCount },
        "Channel stats fetched successfully"
      )
    );
});

const getChannelVideos = asyncHandler(async (req, res) => {
  const channel = req.user;

  const videos = await Video.find({ owner: channel }).select(
    "_id title description thumbnail"
  );

  if (!videos || videos.length === 0) {
    throw new ApiError(404, "No videos found for this channel");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "Channel videos fetched successfully"));
});

export { getChannelStats, getChannelVideos };

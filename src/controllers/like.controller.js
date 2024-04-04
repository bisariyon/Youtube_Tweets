import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { Video } from "../models/videos.model.js";
import { Comment } from "../models/comment.model.js";
import { Tweet } from "../models/tweet.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  const currentUser = req.user;

  const likeExist = await Like.findOne({
    video: new mongoose.Types.ObjectId(videoId),
    likedBy: currentUser,
  });

  if (likeExist) {
    await Like.findByIdAndDelete(likeExist._id);
    await Video.findByIdAndUpdate(videoId, {
      $inc: { likes: -1 },
    });

    return res.status(200).json({
      success: true,
      message: "Video unliked",
    });
  } else {
    const newLike = await Like.create({
      video: videoId,
      likedBy: currentUser,
    });
    await Video.findByIdAndUpdate(videoId, {
      $inc: { likes: 1 },
    });

    return res.status(201).json(new ApiResponse(201, "Video liked"));
  }
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const currentUser = req.user;

  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Video not found");
  }

  const likeExist = await Like.findOne({
    comment: new mongoose.Types.ObjectId(commentId),
    likedBy: currentUser,
  });

  if (likeExist) {
    await Like.findByIdAndDelete(likeExist._id);
    return res.status(200).json({
      success: true,
      message: "Comment unliked",
    });
  } else {
    const newLike = await Like.create({
      comment: commentId,
      likedBy: currentUser,
    });

    return res.status(201).json(new ApiResponse(201, "Comment liked"));
  }
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const tweet = await Tweet.findById(tweetId);
  if (!tweet) {
    throw new ApiError(404, "Video not found");
  }
  const currentUser = req.user;

  const likeExist = await Like.findOne({
    tweet: new mongoose.Types.ObjectId(tweetId),
    likedBy: currentUser,
  });

  if (likeExist) {
    await Like.findByIdAndDelete(likeExist._id);
    return res.status(200).json({
      success: true,
      message: "Tweet unliked",
    });
  } else {
    const newLike = await Like.create({
      tweet: tweetId,
      likedBy: currentUser,
    });

    return res.status(201).json(new ApiResponse(201, "Tweet liked"));
  }
});

const getLikedVideos = asyncHandler(async (req, res) => {
  const currentUser = req.user;

  let likedVideos = await Like.find({
    likedBy: currentUser,
    video: { $exists: true },
  })
    .select("-likedBy -updatedAt -__v")
    .populate({
      path: "video",
      select: "-_id",
      options: {
        select: {
          videoId: "$_id",
          videTitle: "$title",
          description: 1,
          createdAt: 1,
        },
      },
    });

  // 'likedVideos' will contain an array of objects with videoTitle, description, and createdAt fields.

  if (likedVideos.length === 0) {
    return res.status(200).json(new ApiResponse(200, "No liked videos found"));
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, likedVideos, "Liked videos fetched successfully")
    );
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };

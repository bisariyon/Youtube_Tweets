import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Comment } from "../models/comment.model.js";
import { Video } from "../models/videos.model.js";

const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
  };

  const aggregatePipeline = Comment.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
      },
    },
    {
      $unwind: "$owner",
    },
    {
      $project: {
        "owner.password": 0,
        "owner.email": 0,
        "owner.createdAt": 0,
        "owner.updatedAt": 0,
        "owner.__v": 0,
        "owner.refreshToken": 0,
        "owner.watchHistory": 0,
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "video",
      },
    },
    {
      $unwind: "$video",
    },
    {
      $project: {
        "video.owner": 0,
        "video.createdAt": 0,
        "video.updatedAt": 0,
        "video.__v": 0,
      },
    },
  ]);

  const allComments = await Comment.aggregatePaginate(
    aggregatePipeline,
    options
  );

  return res
    .status(200)
    .json(new ApiResponse(200, allComments, "Comments retrieved successfully"));
});

const addComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Invalid video ID");
  }
  const owner = req.user;

  const { content } = req.body;
  if (!content) {
    throw new ApiError(400, "Content is required");
  }

  const comment = Comment.create({
    content,
    video: videoId,
    owner,
  });

  return res.status(201).json(new ApiResponse(201, content, "Comment added"));
});

const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { newContent } = req.body;

  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  const loggedInUser = req.user._id;
  const owner = comment.owner;

  if (loggedInUser.toString() !== owner.toString()) {
    throw new ApiError(403, "You are not allowed to update this comment");
  }

  comment.content = newContent;
  await comment.save();

  return res.status(200).json(new ApiResponse(200, comment, "Comment updated"));
});

const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  const loggedInUser = req.user._id;
  const owner = comment.owner;

  if (loggedInUser.toString() !== owner.toString()) {
    throw new ApiError(403, "You are not allowed to delete this comment");
  }

  await Comment.findByIdAndDelete(commentId);

  return res.status(200).json(new ApiResponse(200, null, "Comment deleted"));
});

export { getVideoComments, addComment, updateComment, deleteComment };

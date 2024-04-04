import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { text } from "express";

const createTweet = asyncHandler(async (req, res) => {
  const { content } = req.body;
  if (!content || content === "") {
    throw new ApiError(400, "Content is required");
  }
  const user = req.user._id;

  const tweet = await Tweet.create({
    owner: user,
    content,
  });

  return res.status(201).json(new ApiResponse(201, { tweet }, "Tweet created"));
});

const getUserTweets = asyncHandler(async (req, res) => {
  const userId = req.params.userId;

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const userTweets = await Tweet.find({ owner: userId }).select("_id content");

  if (userTweets.length === 0) {
    throw new ApiError(404, "No tweets found for this user");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { userTweets }, "User tweets retrieved"));
});

const updateTweet = asyncHandler(async (req, res) => {
  const tweetId = req.params.tweetId;

  const tweet = await Tweet.findById(tweetId);
  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  const tweetOwner = tweet.owner;
  const currentUser = req.user._id;

  if (tweetOwner.toString() !== currentUser.toString()) {
    throw new ApiError(403, "You are not authorized to update this tweet");
  }

  const { newContent } = req.body;
  if (!newContent || newContent === "") {
    throw new ApiError(400, "Content is required");
  }

  tweet.content = newContent;
  await tweet.save();

  return res.status(200).json(new ApiResponse(200, { tweet }, "Tweet updated"));
});

const deleteTweet = asyncHandler(async (req, res) => {
  const tweetId = req.params.tweetId;

  const tweet = await Tweet.findById(tweetId);
  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  const tweetOwner = tweet.owner;
  const currentUser = req.user._id;

  if (tweetOwner.toString() !== currentUser.toString()) {
    throw new ApiError(403, "You are not authorized to update this tweet");
  }

  await Tweet.findByIdAndDelete(tweetId);

  return res.status(200).json(new ApiResponse(200, null, "Tweet deleted"));
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };

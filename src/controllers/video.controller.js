import { Video } from "../models/videos.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import mongoose from "mongoose";

const getAllVideos = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    sortBy = "_id",
    sortType = "1",
    query,
  } = req.query;

  const currentUser = req.user;

  if (!currentUser) {
    throw new ApiError(401, "Unauthorized access to get all videos");
  }

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: { [sortBy]: parseInt(sortType) },
  };

  const pipeline = [
    {
      $match: {
        owner: new mongoose.Types.ObjectId(currentUser._id),
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
  ];

  if (query) {
    pipeline.push({
      $match: {
        $or: [
          {
            title: {
              $regex: query,
              $options: "i", //case-inSensitive
            },
          },
          {
            description: {
              $regex: query,
              $options: "i",
            },
          },
        ],
      },
    });
  }

  const aggregate = await Video.aggregate(pipeline);

  const videosByUser = await Video.aggregatePaginate(aggregate, options);

  return res.status(200).json(new ApiResponse(200, videosByUser, "All videos"));
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  if (!title || !description) {
    throw new ApiError(400, "Title and description are required");
  }
  // console.log("title", title);

  const videoLocalPath = req.files.videoFile[0]?.path;
  if (!videoLocalPath) {
    throw new ApiError(400, "Video file is required");
  }
  // console.log("VideoLocalPath", videoLocalPath);

  const thumbnailLocalPath = req.files.thumbnail[0]?.path;
  if (!thumbnailLocalPath) {
    throw new ApiError(400, "Thumbnail is required");
  }
  // console.log("thumbnailLocalPath", thumbnailLocalPath);

  const videoFile = await uploadOnCloudinary(videoLocalPath);
  if (!videoFile) {
    throw new ApiError(500, "Failed to upload video");
  }
  // console.log("videoFile", videoFile);

  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
  if (!thumbnail) {
    throw new ApiError(500, "Failed to upload thumbnail");
  }

  const user = req.user?._id;
  if (!user) {
    throw new ApiError(401, "Unauthorized access to publish video");
  }

  const video = await Video.create({
    videoFile: videoFile.url,
    thumbnail: thumbnail.url,
    duration: videoFile.duration,
    title,
    description,
    isPublished: true,
    owner: user,
  });

  return res.status(201).json(new ApiResponse(201, "Video published", video));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req?.params;

  const video = await Video.findById(videoId).populate(
    "owner",
    "-password -email -createdAt -updatedAt -__v -refreshToken -watchHistory"
  );
  if (!video) {
    throw new ApiError(404, "Wrong video Id provided");
  }

  // //Optionally adding to user watch history
  // const currentUser = req.user;
  // if (!currentUser) {
  //   throw new ApiError(401, "Unauthorized access to get video by Id");
  // }

  // await User.findByIdAndUpdate(
  //   currentUser._id,
  //   {
  //     $push: {
  //       watchHistory: videoId,
  //     },
  //   },
  //   {
  //     new: true,
  //   }
  // );

  return res
    .status(200)
    .json(new ApiResponse(200, "Video found by given Id", video));
});

const updateVideoDetails = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  let { title, description } = req.body;
  if (!title && !description) {
    throw new ApiError(400, "Title or description is required to update video");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "No video found with given Id");
  }

  const videoOwner = video.owner;
  const currentUser = req.user?._id;

  if (videoOwner.toString() !== currentUser.toString()) {
    throw new ApiError(401, "Unauthorized access to update video");
  }

  if (!title || title === "") {
    title = video.title;
  } else {
    video.title = title;
  }

  if (!description || description === "") {
    description = video.description;
  } else {
    video.description = description;
  }

  const updatedVideo = await video.save();

  return res
    .status(200)
    .json(new ApiResponse(200, "Video updated", updatedVideo));
});

const updateVideoThumbnail = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "No video found with given Id");
  }

  const videoOwner = video.owner;
  const currentUser = req.user?._id;

  if (videoOwner.toString() !== currentUser.toString()) {
    throw new ApiError(401, "Unauthorized access to update video");
  }

  const thumbnailLocalPath = req.file?.path;
  if (!thumbnailLocalPath) {
    throw new ApiError(400, "Thumbnail is missing");
  }

  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
  if (!thumbnail) {
    throw new ApiError(500, "Failed to upload thumbnail");
  }

  video.thumbnail = thumbnail.url;
  video.save();

  return res
    .status(200)
    .json(new ApiResponse(200, "Thumbnail updated", video.thumbnail));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "No video found with given Id");
  }

  const videoOwner = video.owner;
  const currentUser = req.user?._id;

  if (videoOwner.toString() !== currentUser.toString()) {
    throw new ApiError(401, "Unauthorized access to update video");
  }

  await Video.findByIdAndDelete(videoId);
  return res.status(200).json(new ApiResponse(200, "Video deleted"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "No video found with given Id");
  }

  const videoOwner = video.owner;
  const currentUser = req.user?._id;

  if (videoOwner.toString() !== currentUser.toString()) {
    throw new ApiError(401, "Unauthorized access to update video");
  }

  video.isPublished = !video.isPublished;
  video.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "Video publish status updated",
        video.isPublished ? "Published" : "Unpublished"
      )
    );
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideoDetails,
  updateVideoThumbnail,
  deleteVideo,
  togglePublishStatus,
};

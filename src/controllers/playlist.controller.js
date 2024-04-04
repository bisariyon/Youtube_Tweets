import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { Video } from "../models/videos.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  if (!name || !description) {
    throw new ApiError(400, "Name and description are required");
  }

  const ifPlaylistExists = await Playlist.findOne({ name });
  if (ifPlaylistExists) {
    throw new ApiError(400, "Playlist with this name already exists");
  }

  const user = req.user._id;

  const playList = Playlist.create({
    name,
    description,
    owner: user,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, { playList }, "Playlist created"));
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const userPlaylists = await Playlist.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        description: 1,
        // videos: 1,
      },
    },
  ]);

  if (!userPlaylists || userPlaylists.length === 0) {
    throw new ApiError(404, "No playlists found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { userPlaylists }, "User playlists"));
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  const PlaylistDetails = await Playlist.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(playlistId),
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
        _id: 1,
        name: 1,
        description: 1,
        playlistOwner: {
          UserId: "$owner._id",
          Username: "$owner.username",
        },
      },
    },
  ]);

  const playlist = await Playlist.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(playlistId),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
      },
    },
    {
      $unwind: "$videos",
    },
    {
      $project: {
        _id: 0,
        VideoId: "$videos._id",
        title: "$videos.title",
        videoFile: "$videos.videoFile",
      },
    },
  ]);

  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { PlaylistDetails, playlist }, "Playlist"));
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  const playList = await Playlist.findById(playlistId);
  if (!playList) {
    throw new ApiError(404, "Playlist not found");
  }

  const currentUser = req.user._id;
  const owner = playList.owner;
  if (currentUser.toString() !== owner.toString()) {
    throw new ApiError(
      403,
      "You are not authorized to add video to this playlist"
    );
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  playList.videos.push(videoId);
  await playList.save();

  const data = await Playlist.findById(playList._id).select(
    "id name description owner createdAt"
  );

  return res
    .status(200)
    .json(new ApiResponse(200, { data }, "Video added to playlist"));
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  const playList = await Playlist.findById(playlistId);
  if (!playList) {
    throw new ApiError(404, "Playlist not found");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  const currentUser = req.user._id;
  const owner = playList.owner;

  if (currentUser.toString() !== owner.toString()) {
    throw new ApiError(
      403,
      "You are not authorized to delete video to this playlist"
    );
  }

  if (!playList.videos.includes(videoId)) {
    throw new ApiError(404, "Video not found in playlist");
  }

  const index = playList.videos.indexOf(videoId);
  playList.videos.splice(index, 1);
  await playList.save();

  return res
    .status(200)
    .json(new ApiResponse(200, "Video removed from playlist"));
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  const playList = await Playlist.findById(playlistId);
  
  const currentUser = req.user._id;
  const owner = playList.owner;

  if (currentUser.toString() !== owner.toString()) {
    throw new ApiError(
      403,
      "You are not authorized to delete video to this playlist"
    );
  }

  await Playlist.findByIdAndDelete(playlistId);

  return res.status(200).json(new ApiResponse(200, "Playlist deleted"));
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;

  const playList = await Playlist.findById(playlistId);
  if (!playList) {
    throw new ApiError(404, "Playlist not found");
  }

  if (!name || !description) {
    throw new ApiError(400, "Name and description are required");
  }

  const currentUser = req.user._id;
  const owner = playList.owner;
  if (currentUser.toString() !== owner.toString()) {
    throw new ApiError(403, "You are not authorized to update this playlist");
  }

  playList.name = name;
  playList.description = description;
  await playList.save();

  return res.status(200).json(new ApiResponse(200, "Playlist updated"));
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};

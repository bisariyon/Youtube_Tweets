import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const currentUser = req.user;

  const channel = await User.findById(channelId);
  if (!channel) {
    throw new ApiError(404, "Channel not found");
  }

  const subscription = await Subscription.findOne({
    subscriber: currentUser,
    channel: channel,
  });

  if (!subscription) {
    const newSubscription = await Subscription.create({
      subscriber: currentUser,
      channel: channel,
    });

    return res
      .status(201)
      .json(new ApiResponse(201, "Subscribed to channel", newSubscription));
  } else {
    await Subscription.findByIdAndDelete(subscription._id);
    return res
      .status(200)
      .json(new ApiResponse(200, "Unsubscribed from channel", null));
  }
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const currentUser = req.user;

  const currentChannel = await User.findById(channelId);
  if (!currentChannel) {
    throw new ApiError(404, "Channel not found");
  }

  // check if the current user is the owner of the channel or not
  if (currentChannel._id.toString() !== currentUser._id.toString()) {
    throw new ApiError(
      403,
      "You are not authorized to view subscribers of this channel"
    );
  }

  let subscribers = await Subscription.find({ channel: currentChannel })
    .select("-channel -__v")
    .populate({
      path: "subscriber",
      select: "username fullname",
    });

  subscribers = subscribers.map((subscriber) => ({
    SubscriptionId: subscriber._id,
    username: subscriber.subscriber.username,
    fullname: subscriber.subscriber.fullname,
    email: subscriber.subscriber.email,
    createdAt: subscriber.createdAt,
    updatedAt: subscriber.updatedAt,
  }));

  return res
    .status(200)
    .json(new ApiResponse(200, "Subscriberss of the channel", subscribers));
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;
  const subscriber = await User.findById(subscriberId);
  if (!subscriber) {
    throw new ApiError(404, "Subscriber not found");
  }

  const currentUser = req.user;
  if (currentUser._id.toString() !== subscriber._id.toString()) {
    throw new ApiError(
      403,
      "You are not authorized to view subscribed channels of this user"
    );
  }

  let channels = await Subscription.find({ subscriber: subscriber })
    .select("_id channel createdAt")
    .populate({
      path: "channel",
      select: "_id username",
    });

  channels = channels.map((channel) => ({
    channel_Id: channel.channel._id, // Rename _id to channelID
    username: channel.channel.username,
    subscribedAt: channel.createdAt,
  }));

  return res
    .status(200)
    .json(new ApiResponse(200, "Channels subscribed by the user", channels));
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };

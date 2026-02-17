const State = require("../models/State");
const mongoose = require("mongoose");

//  Add State
const addState = async (req, res) => {
  try {
    const { name, country } = req.body;

    if (!name || !country) {
      return res.status(400).json({
        Status: 0,
        Message: "Name and country are required",
      });
    }

    const existing = await State.findOne({
      name: new RegExp(`^${name}$`, "i"),
      country,
    });

    if (existing) {
      return res.status(200).json({
        Status: 0,
        Message: "State already exists",
      });
    }

    const created = await State.create({ name, country });

    if (!created) {
      return res.status(500).json({
        Status: 0,
        Message: "Something went wrong",
      });
    }

    const populatedState = await State.findById(created._id).populate(
      "country",
    );

    return res.status(201).json({
      Status: 1,
      Message: "State added successfully",
      state: populatedState,
    });
  } catch (error) {
    console.error("Add State Error:", error);
    return res.status(500).json({
      Status: 0,
      Message: "Internal Server Error",
    });
  }
};

// Get All States
const getAllState = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", country } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const filter = {};

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    if (country) {
      filter.country = country;
    }

    const list = await State.find(filter)
      .populate("country")
      .sort({ name: 1 })
      .collation({ locale: "en", strength: 1 })
      .limit(limitNum)
      .skip(skip);

    const count = await State.countDocuments(filter);

    return res.status(200).json({
      Status: 1,
      Message: "States fetched successfully",
      totalCount: count,
      states: list,
    });
  } catch (error) {
    console.error("Get All States Error:", error);
    return res.status(500).json({
      Status: 0,
      Message: "Internal Server Error",
    });
  }
};

// Get State By ID
const getStateById = async (req, res) => {
  try {
    const state = await State.findById(req.params.id).populate("country");

    if (!state) {
      return res.status(404).json({
        Status: 0,
        Message: "State not found",
      });
    }

    return res.status(200).json({
      Status: 1,
      Message: "State fetched successfully",
      state,
    });
  } catch (error) {
    console.error("Get State By ID Error:", error);
    return res.status(500).json({
      Status: 0,
      Message: "Internal Server Error",
    });
  }
};

// Update State
const updateState = async (req, res) => {
  try {
    const { name, country } = req.body;

    const state = await State.findById(req.params.id);

    if (!state) {
      return res.status(404).json({
        Status: 0,
        Message: "State not found",
      });
    }

    state.name = name || state.name;
    state.country = country || state.country;

    await state.save();

    const populatedState = await State.findById(state._id).populate("country");

    return res.status(200).json({
      Status: 1,
      Message: "State updated successfully",
      state: populatedState,
    });
  } catch (error) {
    console.error("Update State Error:", error);
    return res.status(500).json({
      Status: 0,
      Message: "Internal Server Error",
    });
  }
};

//  Delete State
const deleteState = async (req, res) => {
  try {
    const state = await State.findById(req.params.id);

    if (!state) {
      return res.status(404).json({
        Status: 0,
        Message: "State not found",
      });
    }

    await state.deleteOne();

    return res.status(200).json({
      Status: 1,
      Message: "State deleted successfully",
    });
  } catch (error) {
    console.error("Delete State Error:", error);
    return res.status(500).json({
      Status: 0,
      Message: "Internal Server Error",
    });
  }
};

module.exports = {
  addState,
  getAllState,
  getStateById,
  updateState,
  deleteState,
};

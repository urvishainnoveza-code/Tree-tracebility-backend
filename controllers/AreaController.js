const mongoose = require("mongoose");
const Area = require("../models/Area");

// Add City
const addArea = async (req, res) => {
  try {
    const { name, country, state, city } = req.body;

    if (!name || !country || !state || !city) {
      return res.status(400).json({
        Status: 0,
        Message: "Name, country, state and city are required",
      });
    }

    const existing = await Area.findOne({
      name: new RegExp(`^${name}$`, "i"),
      country,
      state,
      city,
    });

    if (existing) {
      return res.status(400).json({
        Status: 0,
        Message: "Area already exists",
      });
    }

    const created = await Area.create({ name, country, state, city });
    const populatedArea = await Area.findById(created._id)
      .populate("country", "name")
      .populate("state", "name")
      .populate("city", "name");

    return res.status(201).json({
      Status: 1,
      Message: "Area added successfully",
      area: populatedArea,
    });
  } catch (error) {
    console.error("Add Area Error:", error);
    return res.status(500).json({
      Status: 0,
      Message: "Internal Server Error",
    });
  }
};

// Get All Areas
const getAllAreas = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      country,
      state,
      city,
    } = req.query;

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

    if (state) {
      filter.state = state;
    }
    if (city) {
      filter.city = city;
    }

    const list = await Area.find(filter)
      .populate("country", "name")
      .populate("state", "name")
      .populate("city", "name")

      .sort({ name: 1 })
      .collation({ locale: "en", strength: 1 })
      .limit(limitNum)
      .skip(skip);

    const count = await Area.countDocuments(filter);

    return res.status(200).json({
      Status: 1,
      Message: "Areas fetched successfully",
      totalCount: count,
      areas: list,
    });
  } catch (error) {
    console.error("Get All Areas Error:", error);
    return res.status(500).json({
      Status: 0,
      Message: "Internal Server Error",
    });
  }
};

// Get Area By ID
const getAreaById = async (req, res) => {
  try {
    const area = await Area.findById(req.params.id)
      .populate("country", "name")
      .populate("state", "name")
      .populate("city", "name");
    if (!area) {
      return res.status(404).json({
        Status: 0,
        Message: "Area not found",
      });
    }

    return res.status(200).json({
      Status: 1,
      Message: "Area fetched successfully",
      area,
    });
  } catch (error) {
    console.error("Get Area By ID Error:", error);
    return res.status(500).json({
      Status: 0,
      Message: "Internal Server Error",
    });
  }
};

// Update Area
const updateArea = async (req, res) => {
  try {
    const { name, country, state, city } = req.body;

    const area = await Area.findById(req.params.id);

    if (!area) {
      return res.status(404).json({
        Status: 0,
        Message: "Area not found",
      });
    }
    area.name = name || area.name;
    area.country = country || area.country;
    area.state = state || area.state;
    area.city = city || area.city;

    await area.save();

    const populatedArea = await Area.findById(area._id)
      .populate("country", "name")
      .populate("state", "name")
      .populate("city", "name");

    return res.status(200).json({
      Status: 1,
      Message: "Area updated successfully",
      area: populatedArea,
    });
  } catch (error) {
    console.error("Update Area Error:", error);
    return res.status(500).json({
      Status: 0,
      Message: "Internal Server Error",
    });
  }
};

//  Delete Area
const deleteArea = async (req, res) => {
  try {
    const area = await Area.findById(req.params.id);

    if (!area) {
      return res.status(404).json({
        Status: 0,
        Message: "Area not found",
      });
    }

    await area.deleteOne();

    return res.status(200).json({
      Status: 1,
      Message: "Area deleted successfully",
    });
  } catch (error) {
    console.error("Delete Area Error:", error);
    return res.status(500).json({
      Status: 0,
      Message: "Internal Server Error",
    });
  }
};

module.exports = {
  addArea,
  getAllAreas,
  getAreaById,
  updateArea,
  deleteArea,
};

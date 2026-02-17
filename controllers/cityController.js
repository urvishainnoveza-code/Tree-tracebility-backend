const mongoose = require("mongoose");


//  Add State
const City = require("../models/City");

// Add City
const addCity = async (req, res) => {
  try {
    const { name, country, state } = req.body;

    if (!name || !country || !state) {
      return res.status(400).json({
        Status: 0,
        Message: "Name, country and state are required",
      });
    }

    const existing = await City.findOne({
      name: new RegExp(`^${name}$`, "i"),
      country,
      state,
    });

    if (existing) {
      return res.status(400).json({
        Status: 0,
        Message: "City already exists",
      });
    }

    const created = await City.create({ name, country, state });

    const populatedCity = await City.findById(created._id)
      .populate("country", "name")
      .populate("state", "name");

    return res.status(201).json({
      Status: 1,
      Message: "City added successfully",
      city: populatedCity,
    });
  } catch (error) {
    console.error("Add City Error:", error);
    return res.status(500).json({
      Status: 0,
      Message: "Internal Server Error",
    });
  }
};


// Get All Cities
const getAllCities = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", country, state } = req.query;

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
const list = await City.find(filter)
      .populate("country")
      .populate("state")

      .sort({ name: 1 })
      .collation({ locale: "en", strength: 1 })
      .limit(limitNum)
      .skip(skip);

    const count = await City.countDocuments(filter);

    return res.status(200).json({
      Status: 1,
      Message: "Cities fetched successfully",
      totalCount: count,
      cities: list,
    });
  } catch (error) {
    console.error("Get All Cities Error:", error);
    return res.status(500).json({
      Status: 0,
      Message: "Internal Server Error",
    });
  }
};

// Get City By ID
const getCityById = async (req, res) => {
  try {
    const city = await City.findById(req.params.id).populate("country").populate("state");

    if (!city) {
      return res.status(404).json({
        Status: 0,
        Message: "City not found",
      });
    }

    return res.status(200).json({
      Status: 1,
      Message: "City fetched successfully",
      city,

    });
  } catch (error) {
    console.error("Get State By ID Error:", error);
    return res.status(500).json({
      Status: 0,
      Message: "Internal Server Error",
    });
  }
};

// Update City
const updateCity = async (req, res) => {
  try {
    const { name, country, state } = req.body;

    const city = await City.findById(req.params.id);

    if (!city) {
      return res.status(404).json({
        Status: 0,
        Message: "City not found",
      });
    }
city.name = name || city.name;
    city.country = country || city.country;
    city.state = state || city.state;
  

    await city.save();

    const populatedCity = await City.findById(city._id).populate("country").populate("state");

    return res.status(200).json({
      Status: 1,
      Message: "City updated successfully",
      city: populatedCity,
    });
  } catch (error) {
    console.error("Update City Error:", error);
    return res.status(500).json({
      Status: 0,
      Message: "Internal Server Error",
    });
  }
};

//  Delete City
const deleteCity = async (req, res) => {
  try {
    const city = await City.findById(req.params.id);

    if (!city) {
      return res.status(404).json({
        Status: 0,
        Message: "City not found",
      });
    }

    await city.deleteOne();

    return res.status(200).json({
      Status: 1,
      Message: "City deleted successfully",
    });
  } catch (error) {
    console.error("Delete City Error:", error);
    return res.status(500).json({
      Status: 0,
      Message: "Internal Server Error",
    });
  }
};

module.exports = {
  addCity,
  getAllCities,
  getCityById,
  updateCity,
  deleteCity,
};

//import Country from "../models/Country.js";
const Country = require("../models/Country");

const createCountry = async (req, res) => {
  try {
    const { countryname } = req.body;

    const existingCountry = await Country.findOne({ countryname });
    if (existingCountry) {
      return res.status(400).json({
        success: false,
        message: "Country already exists",
      });
    }

    const country = await Country.create({ countryname });

    res.status(201).json({
      success: true,
      data: country,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/*const getAllCountry = async (req, res) => {
  try {
    const countries = await Country.find().sort({ countryname: 1 });
    res.status(200).json({ success: true, data: countries });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};*/
const getAllCountry = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";

    const skip = (page - 1) * limit;

    // Search filter
    const searchFilter = search
      ? {
          countryname: { $regex: search, $options: "i" },
        }
      : {};

    const totalCount = await Country.countDocuments(searchFilter);

    const countries = await Country.find(searchFilter)
      .sort({ countryname: 1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: countries,
      totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const getCountryById = async (req, res) => {
  try {
    const country = await Country.findById(req.params.id);
    if (!country) {
      return res.status(404).json({
        success: false,
        message: "Country not found",
      });
    }
    res.status(200).json({ success: true, data: country });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateCountry = async (req, res) => {
  try {
    const country = await Country.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!country) {
      return res.status(404).json({
        success: false,
        message: "Country not found",
      });
    }

    res.status(200).json({ success: true, data: country });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteCountry = async (req, res) => {
  try {
    const country = await Country.findByIdAndDelete(req.params.id);
    if (!country) {
      return res.status(404).json({
        success: false,
        message: "Country not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Country deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createCountry,
  getAllCountry,
  getCountryById,
  updateCountry,
  deleteCountry,
};

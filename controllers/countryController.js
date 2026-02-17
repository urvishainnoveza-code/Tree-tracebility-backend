const asyncHandler = require("express-async-handler");
const Country = require("../models/Country");

const addCountry = asyncHandler(async (req, res) => {
  const { name } = req.body;

  const existingCountry = await Country.findOne({
    name: new RegExp(`^${name}$`, "i"),
  });

  if (existingCountry) {
    return res.status(400).json({
      Status: 0,
      Message: "Country already exists",
    });
  }

  const country = await Country.create({ name });

  res.status(201).json({
    Status: 1,
    Message: "Country added Successfully",
    country,
  });
});

const getCountries = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = "" } = req.query;

  const skip = (page - 1) * limit;

  const filter = search ? { name: { $regex: search, $options: "i" } } : {};

  const countries = await Country.find(filter)
    .sort({ name: 1 })
    .limit(Number(limit))
    .skip(Number(skip));

  const count = await Country.countDocuments(filter);

  res.status(200).json({
    Status: 1,
    totalCount: count,
    countries,
  });
});
const getCountryById = asyncHandler(async (req, res) => {
  const country = await Country.findById(req.params.id);
  if (!country) {
    return res.status(404).json({
      Status: 0,
      Message: "Country not found",
    });
  }
  res.status(200).json({
    Status: 1,
    country,
  });
});
const deleteCountry = asyncHandler(async (req, res) => {
  const country = await Country.findById(req.params.id);
  if (!country) {
    return res.status(404).json({
      Status: 0,
      Message: "Country not found",
    });
  }
  await country.deleteOne();
  res.status(200).json({
    Status: 1,
    Message: "Country deleted successfully",
  });
});

module.exports = { addCountry, getCountries, getCountryById, deleteCountry };
